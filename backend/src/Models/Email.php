<?php
namespace MHrachovecSt\Backend\Models;

use PDO;
use PHPMailer\PHPMailer\PHPMailer;

class Email {
    private PDO $db;

    public function __construct(PDO $pdo) {
        $this->db = $pdo;
    }

    public function sendEmail() {
        header('Content-Type: application/json; charset=utf-8');

        try {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
            $isMultipart = stripos($contentType, 'multipart/form-data') !== false || !empty($_FILES) || !empty($_POST);

            if ($isMultipart) {
                $data = $_POST;
            } else {
                $raw = file_get_contents('php://input');
                $json = json_decode($raw, true);
                $data = is_array($json) ? $json : $_POST;
            }

            // recipients parsing (stejné jako dříve) ...
            $recipients = $data['recipients'] ?? [];
            if (is_string($recipients)) {
                $decoded = json_decode($recipients, true);
                if (is_array($decoded)) {
                    $recipients = $decoded;
                } else {
                    $recipients = array_filter(array_map('trim', explode(',', $recipients)));
                }
            }
            if (!is_array($recipients)) $recipients = [$recipients];

            $validRecipients = [];
            foreach ($recipients as $r) {
                $email = filter_var(trim((string)$r), FILTER_VALIDATE_EMAIL);
                if ($email !== false) $validRecipients[] = $email;
            }
            if (empty($validRecipients)) {
                http_response_code(400);
                echo json_encode(['error' => 'Nebyl zadán žádný platný příjemce']);
                return;
            }

            $subject = isset($data['subject']) ? trim((string)$data['subject']) : '(no subject)';
            $isHtml = filter_var($data['isHtml'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $body = $data['body'] ?? '';
            $messageHtml = $data['message_html'] ?? '';
            $altText = $data['alt_text'] ?? '';
            $mailBodyHtml = $messageHtml !== '' ? $messageHtml : ($isHtml ? $body : '');

            // PHPMailer setup (stejné)
            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->SMTPAuth = true;
            $mail->SMTPSecure = 'ssl';
            $mail->Host = 'smtp.seznam.cz';
            $mail->Port = 465;
            $mail->isHTML($isHtml);
            $mail->Username = 'spsei-wea@email.cz';
            $mail->Password = 'WeboveAplikace2024';
            $mail->setFrom($mail->Username, 'Marek Hrachovec');
            $mail->Subject = $subject;
            if ($isHtml) {
                $mail->Body = $mailBodyHtml ?: $altText;
                if ($altText) $mail->AltBody = $altText;
            } else {
                $mail->Body = $body !== '' ? $body : $altText;
            }
            foreach ($validRecipients as $r) $mail->addAddress($r);

            $this->db->beginTransaction();

            $insertEmail = $this->db->prepare(
                'INSERT INTO `emails` (subject, body_html, body_text, status, note) VALUES (:subject, :body_html, :body_text, :status, :note)'
            );
            $insertEmail->execute([
                ':subject' => $subject,
                ':body_html' => $isHtml ? $mailBodyHtml : null,
                ':body_text' => $isHtml ? ($altText ?: $body) : $body,
                ':status' => 'pending',
                ':note' => json_encode(array_values($validRecipients), JSON_UNESCAPED_UNICODE),
            ]);
            $emailId = (int)$this->db->lastInsertId();

            $movedFiles = [];
            $uploadDir = dirname(__DIR__, 2) . '/uploads';
            if (!is_dir($uploadDir)) {
                if (!mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
                    throw new \RuntimeException("Nelze vytvořit upload složku: $uploadDir");
                }
            }

            $fileInsert = $this->db->prepare(
                "INSERT INTO `files` (`filename`, `original_name`, `path`, `mime_type`, `size`, `storage`, `uploaded_by`, `created_at`) VALUES (:filename, :original_name, :path, :mime, :size, :storage, :uploaded_by, NOW())"
            );
            $attachInsert = $this->db->prepare(
                'INSERT INTO `email_attachments` (email_id, file_id) VALUES (:email_id, :file_id)'
            );

            // zpracovat nové nahrané soubory (stejné jako dříve)
            if (!empty($_FILES['attachments'])) {
                $files = $_FILES['attachments'];
                if (is_array($files['name'])) {
                    for ($i = 0; $i < count($files['name']); $i++) {
                        if (($files['error'][$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) continue;
                        $tmp = $files['tmp_name'][$i];
                        $original = basename($files['name'][$i]);
                        if (!is_uploaded_file($tmp)) continue;
                        $safe = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $original);
                        $destName = time() . '_' . bin2hex(random_bytes(6)) . '_' . $safe;
                        $destPath = $uploadDir . '/' . $destName;
                        if (!move_uploaded_file($tmp, $destPath)) {
                            throw new \RuntimeException("Nelze přesunout soubor $original");
                        }
                        $movedFiles[] = $destPath;

                        $fileInsert->execute([
                            ':filename' => $destName,
                            ':original_name' => $original,
                            ':path' => $destPath,
                            ':mime' => $files['type'][$i] ?? null,
                            ':size' => (int)($files['size'][$i] ?? 0),
                            ':storage' => 'local',
                            ':uploaded_by' => null,
                        ]);
                        $fileId = (int)$this->db->lastInsertId();

                        $attachInsert->execute([
                            ':email_id' => $emailId,
                            ':file_id' => $fileId,
                        ]);

                        $mail->addAttachment($destPath, $original);
                    }
                } else {
                    if (($files['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                        $tmp = $files['tmp_name'];
                        $original = basename($files['name']);
                        if (is_uploaded_file($tmp)) {
                            $safe = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $original);
                            $destName = time() . '_' . bin2hex(random_bytes(6)) . '_' . $safe;
                            $destPath = $uploadDir . '/' . $destName;
                            if (!move_uploaded_file($tmp, $destPath)) {
                                throw new \RuntimeException("Nelze přesunout soubor $original");
                            }
                            $movedFiles[] = $destPath;

                            $fileInsert->execute([
                                ':filename' => $destName,
                                ':original_name' => $original,
                                ':path' => $destPath,
                                ':mime' => $files['type'] ?? null,
                                ':size' => (int)($files['size'] ?? 0),
                                ':storage' => 'local',
                                ':uploaded_by' => null,
                            ]);
                            $fileId = (int)$this->db->lastInsertId();

                            $attachInsert->execute([
                                ':email_id' => $emailId,
                                ':file_id' => $fileId,
                            ]);

                            $mail->addAttachment($destPath, $original);
                        }
                    }
                }
            }

            // zpracovat existující vybrané soubory (file_ids)
            $fileIds = [];
            if ($isMultipart) {
                if (!empty($_POST['file_ids'])) {
                    $fileIds = is_array($_POST['file_ids']) ? $_POST['file_ids'] : [$_POST['file_ids']];
                }
            } else {
                if (!empty($data['file_ids'])) {
                    $fileIds = is_array($data['file_ids']) ? $data['file_ids'] : [$data['file_ids']];
                }
            }

            if (!empty($fileIds)) {
                $stmtFile = $this->db->prepare('SELECT id, path, original_name FROM `files` WHERE id = :id LIMIT 1');
                foreach ($fileIds as $fid) {
                    $fid = (int)$fid;
                    if ($fid <= 0) continue;
                    $stmtFile->execute([':id' => $fid]);
                    $row = $stmtFile->fetch(PDO::FETCH_ASSOC);
                    if (!$row) continue;
                    if (!empty($row['path']) && file_exists($row['path'])) {
                        $mail->addAttachment($row['path'], $row['original_name'] ?? null);
                    }
                    $attachInsert->execute([
                        ':email_id' => $emailId,
                        ':file_id' => $row['id'],
                    ]);
                }
            }

            if (!$mail->send()) {
                $this->db->rollBack();
                foreach ($movedFiles as $p) @unlink($p);
                http_response_code(500);
                echo json_encode(['error' => 'Nepodařilo se odeslat email', 'message' => $mail->ErrorInfo]);
                return;
            }

            $update = $this->db->prepare('UPDATE `emails` SET status = :status, sent_at = NOW() WHERE id = :id');
            $update->execute([':status' => 'sent', ':id' => $emailId]);

            $this->db->commit();
            echo json_encode(['success' => true, 'message' => 'Email odeslán']);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            if (!empty($movedFiles) && is_array($movedFiles)) {
                foreach ($movedFiles as $p) {
                    if (file_exists($p)) @unlink($p);
                }
            }
            http_response_code(500);
            echo json_encode(['error' => 'Exception', 'message' => $e->getMessage()]);
        }
    }
}
