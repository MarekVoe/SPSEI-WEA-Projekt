<?php
namespace MHrachovecSt\Backend\Models;

use PDO;

class Contact {
    private PDO $db;

    public function __construct(PDO $pdo) {
        $this->db = $pdo;
    }

    public function all(): array {
        $stmt = $this->db->query('SELECT id, email, first_name AS firstName, last_name AS lastName, created_at FROM contacts ORDER BY first_name, last_name');
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array {
        $stmt = $this->db->prepare('SELECT id, email, first_name AS firstName, last_name AS lastName FROM contacts WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int {
        $stmt = $this->db->prepare('INSERT INTO contacts (email, first_name, last_name) VALUES (:email, :first_name, :last_name)');
        $stmt->execute([
            ':email' => $data['email'],
            ':first_name' => $data['firstName'] ?? $data['first_name'] ?? null,
            ':last_name' => $data['lastName'] ?? $data['last_name'] ?? null,
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool {
        $stmt = $this->db->prepare('UPDATE contacts SET email = :email, first_name = :first_name, last_name = :last_name WHERE id = :id');
        return $stmt->execute([
            ':email' => $data['email'],
            ':first_name' => $data['firstName'] ?? $data['first_name'] ?? null,
            ':last_name' => $data['lastName'] ?? $data['last_name'] ?? null,
            ':id' => $id,
        ]);
    }

    public function delete(int $id): bool {
        $stmt = $this->db->prepare('DELETE FROM contacts WHERE id = ?');
        return $stmt->execute([$id]);
    }
}