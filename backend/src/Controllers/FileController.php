<?php
namespace MHrachovecSt\Backend\Controllers;

use PDO;

class FileController {
    private PDO $db;

    public function __construct(PDO $pdo) {
        $this->db = $pdo;
    }

    public function recent(): void {
        header('Content-Type: application/json; charset=utf-8');
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $limit = max(1, min(100, $limit));
        $stmt = $this->db->prepare('SELECT id, filename, original_name, path, `mime_type` as mime, size, storage, uploaded_by, created_at FROM `files` ORDER BY created_at DESC LIMIT :l');
        $stmt->bindValue(':l', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($rows);
    }
}
