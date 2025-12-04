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
            $recipients = $_POST['recipients'] ?? [];
            if (!is_array($recipients)) {
                $recipients = [$recipients];
            }

            $validRecipients = [];
            foreach ($recipients as $r) {
                $email = filter_var(trim((string)$r), FILTER_VALIDATE_EMAIL);
                if ($email !== false) $validRecipients[] = $email;
            }

            if (empty($validRecipients)) {
                http_response_code(400);
                echo json_encode(['error' => 'No valid recipients provided']);
                return;
            }

            $subject = isset($_POST['subject']) ? trim($_POST['subject']) : '(no subject)';
            $bodyHtml = $_POST['message_html'] ?? $_POST['body'] ?? '';
            $altText = $_POST['alt_text'] ?? '';

            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->SMTPAuth = true;
            $mail->SMTPSecure = 'ssl';
            $mail->Host = 'smtp.seznam.cz';
            $mail->Port = 465;
            $mail->isHTML((bool)$bodyHtml);

            $mail->Username = 'spsei-wea@email.cz';
            $mail->Password = 'WeboveAplikace2024';

            $mail->setFrom($mail->Username, 'Marek Hrachovec');
            $mail->Subject = $subject;
            $mail->Body = $bodyHtml ?: $altText;
            if ($altText) $mail->AltBody = $altText;

            foreach ($validRecipients as $r) {
                $mail->addAddress($r);
            }

            if (!$mail->send()) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to send email', 'message' => $mail->ErrorInfo]);
                return;
            }

            echo json_encode(['success' => true]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Exception', 'message' => $e->getMessage()]);
        }
    }
}
