<?php
// api/absentees.php
// GET - the students marked absent, for the notification bell.
//
//   ?date=YYYY-MM-DD   optional, defaults to today
//   ?semesterId=N      optional
//   ?departmentId=N    optional
//
// Absentees are read from attendance_records joined to attendance_sessions,
// never reconstructed. If the requested day has no session at all, the most
// recent dated session is used instead and `isFallback` tells the UI to label
// the panel with that real date rather than pretending it is today.
require_once __DIR__ . '/config.php';

$requestedDate = isset($_GET['date']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$_GET['date'])
    ? (string)$_GET['date']
    : date('Y-m-d');

$semesterId   = isset($_GET['semesterId'])   ? (int)$_GET['semesterId']   : 0;
$departmentId = isset($_GET['departmentId']) ? (int)$_GET['departmentId'] : 0;

try {
    $pdo = dbOrFail();

    $where  = ['1=1'];
    $params = [];

    if ($semesterId > 0)   { $where[] = "ses.semester_id = :sem";    $params['sem']    = $semesterId; }
    if ($departmentId > 0) { $where[] = "s.department_id = :dept";   $params['dept']   = $departmentId; }

    // Never empty, so every query below can use it verbatim after a WHERE.
    $whereSql = implode(' AND ', $where);

    // ---- 1. the requested day, falling back to the newest dated session ----
    $findDate = $pdo->prepare(
        "SELECT ses.session_date
         FROM attendance_sessions ses
         INNER JOIN students s ON s.semester_id = ses.semester_id
         WHERE $whereSql
         ORDER BY ses.session_date DESC
         LIMIT 1"
    );
    $findDate->execute($params);

    $effectiveDate = $requestedDate;
    $isFallback   = false;

    $hasRequested = $pdo->prepare(
        "SELECT COUNT(*)
         FROM attendance_sessions ses
         INNER JOIN students s ON s.semester_id = ses.semester_id
         WHERE ses.session_date = :d AND $whereSql"
    );
    $hasParams = $params;
    $hasParams['d'] = $requestedDate;
    $hasRequested->execute($hasParams);

    if ((int)$hasRequested->fetchColumn() === 0) {
        $found = $findDate->fetchColumn();
        if ($found === false || $found === null) {
            // Nothing marked at all: an empty, honest result.
            sendJsonResponse([
                'success'    => true,
                'date'       => $requestedDate,
                'isFallback' => false,
                'count'      => 0,
                'sessions'   => [],
                'students'   => []
            ]);
        }
        $effectiveDate = (string)$found;
        $isFallback   = $effectiveDate !== $requestedDate;
    }

    // ---- 2. every student absent on that date ----
    $sql = "SELECT ar.id            AS record_id,
                   ar.status,
                   s.id            AS student_id,
                   s.name,
                   s.roll_no,
                   s.phone,
                   s.guardian_name,
                   s.guardian_phone,
                   s.email,
                   s.year,
                   d.name          AS dept,
                   sem.semester_number AS semester,
                   ses.session_date,
                   ses.id          AS session_id
            FROM attendance_records ar
            INNER JOIN attendance_sessions ses ON ses.id = ar.session_id
            INNER JOIN students s  ON s.id  = ar.student_id
            INNER JOIN departments d ON d.id = s.department_id
            INNER JOIN semesters sem ON sem.id = ses.semester_id
            WHERE ses.session_date = :d
              AND ar.status = 'absent'
              AND $whereSql
            ORDER BY s.roll_no ASC";

    $st = $pdo->prepare($sql);
    $stParams = $params;
    $stParams['d'] = $effectiveDate;
    $st->execute($stParams);

    $students = [];
    foreach ($st->fetchAll() as $r) {
        $students[] = [
            'recordId'      => (int)$r['record_id'],
            'studentId'     => (int)$r['student_id'],
            'name'          => $r['name'],
            'rollNo'        => $r['roll_no'],
            'phone'         => $r['phone'],
            'guardianName'  => $r['guardian_name'],
            'guardianPhone' => $r['guardian_phone'],
            'email'         => $r['email'],
            'year'          => (int)$r['year'],
            'dept'          => $r['dept'],
            'semester'      => (int)$r['semester'],
            'sessionDate'   => $r['session_date'],
            'sessionId'     => (int)$r['session_id']
        ];
    }

    // ---- 3. how many were marked on that date, for the bell badge ----
    // Same joins and filters as the query above, just grouped instead of
    // restricted to 'absent'. The extra students join used for department
    // filtering is omitted when unused, because joining students on
    // semester_id alone multiplies the row count.
    $tallySql = "SELECT ar.status, COUNT(*) AS n
                 FROM attendance_records ar
                 INNER JOIN attendance_sessions ses ON ses.id = ar.session_id";
    $tallyParams = ['d' => $effectiveDate];

    if ($departmentId > 0) {
        $tallySql .= " INNER JOIN students s ON s.id = ar.student_id AND s.department_id = :dept";
        $tallyParams['dept'] = $departmentId;
    }
    $tallySql .= " WHERE ses.session_date = :d";
    if ($semesterId > 0) {
        $tallySql .= " AND ses.semester_id = :sem";
        $tallyParams['sem'] = $semesterId;
    }
    $tallySql .= " GROUP BY ar.status";

    $tally = $pdo->prepare($tallySql);
    $tally->execute($tallyParams);

    $counts = ['present' => 0, 'absent' => 0, 'late' => 0, 'excused' => 0];
    foreach ($tally->fetchAll() as $row) {
        $counts[(string)$row['status']] = (int)$row['n'];
    }

    sendJsonResponse([
        'success'    => true,
        'date'       => $effectiveDate,
        'requested'  => $requestedDate,
        'isFallback' => $isFallback,
        'count'      => count($students),
        'counts'     => $counts,
        'students'   => $students
    ]);

} catch (PDOException $e) {
    sendPdoError($e, 'Could not load today\'s absentees.');
}
