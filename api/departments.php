<?php
// api/departments.php
require_once __DIR__ . '/config.php';

try {
    $pdo = getDBConnection();

    $sql = "
        SELECT 
            d.dept_key AS id,
            d.id AS db_id,
            d.name,
            d.code,
            d.icon,
            d.color,
            d.bg_color AS bgColor,
            d.border_color AS borderColor,
            d.hod,
            d.faculty_count AS facultyCount,
            d.sparkline,
            COUNT(DISTINCT s.id) AS studentCount,
            ROUND(AVG(m.marks), 1) AS averageScore
        FROM `departments` d
        LEFT JOIN `students` s ON d.id = s.department_id
        LEFT JOIN `marks` m ON s.id = m.student_id AND s.semester_id = m.semester_id
        GROUP BY d.id, d.dept_key, d.name, d.code, d.icon, d.color, d.bg_color, d.border_color, d.hod, d.faculty_count, d.sparkline
        ORDER BY d.id ASC
    ";

    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll();

    if ($rows && count($rows) > 0) {
        $result = [];
        foreach ($rows as $r) {
            $sparkline = json_decode($r['sparkline'], true);
            if (!is_array($sparkline)) {
                // No sparkline stored for this department: report that honestly
                // instead of drawing an invented trend. The UI renders nothing.
                $sparkline = null;
            }

            $result[] = [
                'id' => $r['id'],
                'dbId' => (int)$r['db_id'],
                'name' => $r['name'],
                'code' => $r['code'],
                'icon' => $r['icon'],
                'color' => $r['color'],
                'bgColor' => $r['bgColor'],
                'borderColor' => $r['borderColor'],
                'hod' => $r['hod'],
                'facultyCount' => (int)$r['facultyCount'],
                'sparkline' => $sparkline,
                'studentCount' => (int)$r['studentCount'],
                'averageScore' => $r['averageScore'] === null ? null : (float)$r['averageScore']
            ];
        }
        sendJsonResponse($result);
    }
} catch (PDOException $e) {
    // The database is the single source of truth. If it is unreachable we
    // report the real failure instead of serving invented data.
    sendDbUnavailable($e);
}
