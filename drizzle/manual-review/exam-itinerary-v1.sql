-- Additive candidate for the disposable pilot, after exam-history-v1.sql.
CREATE TABLE examItineraries (
 userId int NOT NULL PRIMARY KEY,
 revision varchar(36) NOT NULL,
 bookmarkJson text NOT NULL,
 savedAtMs bigint NOT NULL,
 CONSTRAINT examItineraries_user_fk FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
