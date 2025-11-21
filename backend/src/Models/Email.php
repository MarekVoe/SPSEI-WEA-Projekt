<?php
namespace MHrachovecSt\Backend\Models;

use PDO;

class Email {
    private PDO $db;

    public function __construct(PDO $pdo)
    {
        $this->db = $pdo;
    }

    public function createEmail(array $data): int
    {
        $stmt = $this->db->prepare('INSERT INTO emails (from_email, from_name, subject, body_html, body_text, status, created_at) VALUES (:from_email, :from_name, :subject, :body_html, :body_text, :status, NOW())');
        $stmt->execute([
            ':from_email' => $data['from_email'] ?? null,
            ':from_name'  => $data['from_name'] ?? null,
            ':subject'    => $data['subject'] ?? null,
            ':body_html'  => $data['body_html'] ?? null,
            ':body_text'  => $data['body_text'] ?? null,
            ':status'     => $data['status'] ?? 'queued',
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function addRecipient(int $emailId, string $recipientEmail, ?string $recipientName = null, ?int $contactId = null, string $type = 'to'): bool
    {
        $stmt = $this->db->prepare('INSERT INTO email_recipients (email_id, contact_id, recipient_email, recipient_name, recipient_type) VALUES (:email_id, :contact_id, :recipient_email, :recipient_name, :recipient_type)');
        return $stmt->execute([
            ':email_id' => $emailId,
            ':contact_id' => $contactId,
            ':recipient_email' => $recipientEmail,
            ':recipient_name' => $recipientName,
            ':recipient_type' => $type,
        ]);
    }

    public function addAttachment(int $emailId, int $fileId): bool
    {
        $stmt = $this->db->prepare('INSERT INTO email_attachments (email_id, file_id) VALUES (:email_id, :file_id)');
        return $stmt->execute([
            ':email_id' => $emailId,
            ':file_id' => $fileId,
        ]);
    }

    public function markSent(int $emailId): bool
    {
        $stmt = $this->db->prepare('UPDATE emails SET status = "sent", sent_at = NOW() WHERE id = :id');
        return $stmt->execute([':id' => $emailId]);
    }

    public function markFailed(int $emailId): bool
    {
        $stmt = $this->db->prepare('UPDATE emails SET status = "failed" WHERE id = :id');
        return $stmt->execute([':id' => $emailId]);
    }
}
