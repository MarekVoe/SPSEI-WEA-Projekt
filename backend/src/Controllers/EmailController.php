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

    public function send(): void {
        $this->model->sendEmail();
    }
}
