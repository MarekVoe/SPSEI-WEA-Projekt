<?php
namespace MHrachovecSt\Backend\Controllers;

use MHrachovecSt\Backend\Models\Contact;
use PDO;

class ContactController {
    private Contact $model;

    public function __construct(PDO $pdo)
    {
        $this->model = new Contact($pdo);
    }

    public function index()
    {
        header('Content-Type: application/json');
        echo json_encode($this->model->all());
    }

    public function store()
    {
        $data = $_POST ?: json_decode(file_get_contents('php://input'), true);
        if (empty($data['email']) || empty($data['firstName']) || empty($data['lastName'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing fields']);
            return;
        }
        $id = $this->model->create($data);
        http_response_code(201);
        echo json_encode(['id' => $id]);
    }

    public function update($id)
    {
        $data = $_POST ?: json_decode(file_get_contents('php://input'), true);
        if (!$this->model->update((int)$id, $data)) {
            http_response_code(500);
            echo json_encode(['error' => 'Update failed']);
            return;
        }
        echo json_encode(['ok' => true]);
    }

    public function delete($id)
    {
        if (!$this->model->delete((int)$id)) {
            http_response_code(500);
            echo json_encode(['error' => 'Delete failed']);
            return;
        }
        echo json_encode(['ok' => true]);
    }
}
