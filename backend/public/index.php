<?php
require __DIR__ . '/../vendor/autoload.php';

use FastRoute\RouteCollector;
use function FastRoute\simpleDispatcher;
use MHrachovecSt\Backend\Models\Database;

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dispatcher = simpleDispatcher(function (RouteCollector $r) {
    $r->addRoute('GET',    '/api/contacts',             ['ContactController', 'index']);
    $r->addRoute('POST',   '/api/contacts',             ['ContactController', 'store']);
    $r->addRoute('PUT',    '/api/contacts/{id:\d+}',    ['ContactController', 'update']);
    $r->addRoute('DELETE', '/api/contacts/{id:\d+}',    ['ContactController', 'delete']);

    $r->addRoute('POST',   '/api/send-email',           ['EmailController', 'send']);

    $r->addRoute('GET',    '/api/files/recent',        ['FileController', 'recent']);
});

$routeInfo = $dispatcher->dispatch($_SERVER['REQUEST_METHOD'], parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

switch ($routeInfo[0]) {
    case \FastRoute\Dispatcher::NOT_FOUND:
        http_response_code(404);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Route not found']);
        break;

    case \FastRoute\Dispatcher::METHOD_NOT_ALLOWED:
        http_response_code(405);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Method not allowed']);
        break;

    case \FastRoute\Dispatcher::FOUND:
        $handler = $routeInfo[1];
        $vars = $routeInfo[2];

        [$class, $method] = $handler;
        $controllerClass = "MHrachovecSt\\Backend\\Controllers\\$class";

        try {
            $pdo = Database::getConnection();

            if (!class_exists($controllerClass)) {
                throw new \RuntimeException("Controller $controllerClass not found");
            }

            $controller = new $controllerClass($pdo);

            if (!method_exists($controller, $method)) {
                throw new \RuntimeException("Method $method not found in $controllerClass");
            }

            $ref = new \ReflectionMethod($controller, $method);
            $paramCount = $ref->getNumberOfParameters();

            if ($paramCount === 0) {
                $controller->$method();
            } elseif ($paramCount === 1 && isset($vars['id'])) {
                $controller->$method($vars['id']);
            } else {
                $controller->$method($vars);
            }
        } catch (\Throwable $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;
}