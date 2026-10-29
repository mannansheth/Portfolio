-- Additive detailed analytics schema. The earlier analytics_events table is kept intact.
CREATE TABLE IF NOT EXISTS analytics_visitors (
 visitor_id CHAR(36) PRIMARY KEY,
 first_seen DATETIME NOT NULL,
 last_seen DATETIME NOT NULL,
 INDEX analytics_visitor_seen (last_seen)
);

CREATE TABLE IF NOT EXISTS analytics_sessions (
 session_id CHAR(36) PRIMARY KEY,
 visitor_id CHAR(36) NOT NULL,
 started_at DATETIME NOT NULL,
 last_seen DATETIME NOT NULL,
 entry_path VARCHAR(255) NOT NULL,
 exit_path VARCHAR(255) NOT NULL,
 referrer_host VARCHAR(253) NULL,
 page_views INT UNSIGNED NOT NULL DEFAULT 0,
 country_code CHAR(2) NULL,
 country VARCHAR(100) NULL,
 region VARCHAR(120) NULL,
 city VARCHAR(120) NULL,
 device_type VARCHAR(20) NOT NULL DEFAULT 'Other',
 browser VARCHAR(40) NOT NULL DEFAULT 'Other',
 operating_system VARCHAR(40) NOT NULL DEFAULT 'Other',
 FOREIGN KEY (visitor_id) REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE,
 INDEX analytics_session_period (started_at,last_seen),
 INDEX analytics_session_visitor (visitor_id,started_at)
);

CREATE TABLE IF NOT EXISTS analytics_event_log (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 visitor_id CHAR(36) NOT NULL,
 session_id CHAR(36) NOT NULL,
 event_type VARCHAR(40) NOT NULL,
 page_path VARCHAR(255) NOT NULL,
 project_slug VARCHAR(120) NULL,
 event_data JSON NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (visitor_id) REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE,
 FOREIGN KEY (session_id) REFERENCES analytics_sessions(session_id) ON DELETE CASCADE,
 INDEX analytics_period (created_at,event_type),
 INDEX analytics_path (event_type,page_path,created_at),
 INDEX analytics_project (project_slug,event_type,created_at),
 INDEX analytics_session (session_id,created_at)
);
