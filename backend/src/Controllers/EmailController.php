<?php
namespace MHrachovecSt\Backend\Controllers;

use MHrachovecSt\Backend\Models\Email;
use PDO;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class EmailController {
    private PDO $db;
    private Email $model;

    public function __construct(PDO $pdo)
    {
        $this->db = $pdo;
        $this->model = new Email($pdo);
    }

    public function send()
    {
        $recipients = $_POST['recipients'] ?? [];
        $subject = $_POST['subject'] ?? '';
        $body_html = $_POST['body_html'] ?? '';
        $body_text = $_POST['body_text'] ?? '';

        if (empty($recipients)) {
            http_response_code(400);
            echo json_encode(['error' => 'No recipients']);
            return;
        }

        $emailId = $this->model->createEmail([
            'from_email' => $_POST['from_email'] ?? null,
            'from_name'  => $_POST['from_name'] ?? null,
            'subject'    => $subject,
            'body_html'  => $body_html,
            'body_text'  => $body_text,
            'status'     => 'queued',
        ]);

        // zpracovat upload příloh (pokud existují)
        $uploadedFileIds = [];
        if (!empty($_FILES['attachments'])) {
            // pole polí — správný název form inputu: attachments[]
            $files = $_FILES['attachments'];
            $count = is_array($files['name']) ? count($files['name']) : 0;
            for ($i = 0; $i < $count; $i++) {
                if ($files['error'][$i] !== UPLOAD_ERR_OK) continue;
                $original = basename($files['name'][$i]);
                $ext = pathinfo($original, PATHINFO_EXTENSION);
                $stored = uniqid('f_') . ($ext ? ".{$ext}" : '');
                $uploadDir = __DIR__ . '/../../public/uploads';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
                $target = $uploadDir . '/' . $stored;
                if (move_uploaded_file($files['tmp_name'][$i], $target)) {
                    $stmt = $this->db->prepare('INSERT INTO files (filename, original_name, path, mime_type, size, storage, created_at) VALUES (:filename, :original_name, :path, :mime_type, :size, :storage, NOW())');
                    $stmt->execute([
                        ':filename' => $stored,
                        ':original_name' => $original,
                        ':path' => 'uploads/' . $stored,
                        ':mime_type' => $files['type'][$i] ?? null,
                        ':size' => $files['size'][$i] ?? 0,
                        ':storage' => 'upload',
                    ]);
                    $uploadedFileIds[] = (int)$this->db->lastInsertId();
                }
            }
        }

        foreach ($recipients as $r) {
            $contactId = null;
            $emailAddr = $r;
            $name = null;
            if (strpos($r, '|') !== false) {
                [$emailAddr, $contactId] = explode('|', $r, 2);
                $contactId = (int)$contactId ?: null;
            }
            $this->model->addRecipient($emailId, $emailAddr, $name, $contactId, 'to');
        }

        foreach ($uploadedFileIds as $fileId) {
            $this->model->addAttachment($emailId, $fileId);
        }

        $sent = false;
        try {
            if (class_exists(PHPMailer::class)) {
                $mail = new PHPMailer(true);
                $mail->CharSet = 'UTF-8';
                $mail->setFrom($_POST['from_email'] ?? 'no-reply@example.com', $_POST['from_name'] ?? '');
                foreach ($recipients as $r) {
                    $addr = $r;
                    if (strpos($r, '|') !== false) $addr = explode('|', $r, 2)[0];
                    $mail->addAddress($addr);
                }
                $mail->Subject = $subject;
                $mail->isHTML(!empty($body_html));
                $mail->Body = $body_html ?: $body_text;
                $mail->AltBody = $body_text ?: strip_tags($body_html);
                foreach ($uploadedFileIds as $fileId) {
                    $stmt = $this->db->prepare('SELECT path, original_name FROM files WHERE id = ?');
                    $stmt->execute([$fileId]);
                    $f = $stmt->fetch();
                    if ($f) {
                        $mail->addAttachment(__DIR__ . '/../../public/' . $f['path'], $f['original_name']);
                    }
                }
                $mail->send();
                $sent = true;
            } else {
                $to = implode(',', array_map(fn($r) => explode('|', $r)[0], $recipients));
                $headers = "MIME-Version: 1.0\r\n";
                if (!empty($body_html)) {
                    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
                } else {
                    $headers .= "Content-type: text/plain; charset=UTF-8\r\n";
                }
                $from = $_POST['from_email'] ?? 'no-reply@example.com';
                $headers .= "From: {$from}\r\n";
                $sent = mail($to, $subject, $body_html ?: $body_text, $headers);
            }
        } catch (\Exception $e) {
            $sent = false;
        }

        if ($sent) {
            $this->model->markSent($emailId);
            echo json_encode(['ok' => true, 'emailId' => $emailId]);
        } else {
            $this->model->markFailed($emailId);
            http_response_code(500);
            echo json_encode(['error' => 'Send failed', 'emailId' => $emailId]);
        }
    }
}
