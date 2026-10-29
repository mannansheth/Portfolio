CREATE TABLE IF NOT EXISTS analytics_events (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 session_id CHAR(36) NOT NULL,
 event_type ENUM('page_view','project_view') NOT NULL,
 page_path VARCHAR(255) NOT NULL,
 referrer_host VARCHAR(253) NULL,
 device_type ENUM('desktop','mobile') NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX analytics_period (created_at, event_type),
 INDEX analytics_path (event_type, page_path, created_at),
 INDEX analytics_session (session_id, created_at)
);
