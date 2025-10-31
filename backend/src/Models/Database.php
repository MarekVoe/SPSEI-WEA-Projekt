<?php
namespace MHrachovecSt\Backend\Models;
use PDO;
class Database {

    private static $connection;
    public static function getConnection() {
        if (!self::$connection) {
            $host = $_ENV['DB_HOST'] ?? "localhost";
            $dbname = $_ENV['DB_NAME'] ?? "";
            $username = $_ENV['DB_USER'] ?? "root";
            $password = $_ENV['DB_PASS'] ?? "";
            $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";

            try {
                self::$connection = new \PDO($dsn, $username, $password);
                self::$connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            } catch (\PDOException $e) {
                die("Connection failed: " . $e->getMessage());
            }
        }
        return self::$connection;
    }
}