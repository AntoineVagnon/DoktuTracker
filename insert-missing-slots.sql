-- Insert missing time slots for Dr James Rodriguez (ID 9) for July 31, 2025

INSERT INTO "timeSlots" ("doctorId", date, "startTime", "endTime", "isAvailable", "createdAt", "updatedAt")
VALUES 
  (9, '2025-07-31', '09:00:00', '09:30:00', true, NOW(), NOW()),
  (9, '2025-07-31', '09:30:00', '10:00:00', true, NOW(), NOW()),
  (9, '2025-07-31', '10:00:00', '10:30:00', true, NOW(), NOW()),
  (9, '2025-07-31', '10:30:00', '11:00:00', true, NOW(), NOW()),
  (9, '2025-07-31', '11:00:00', '11:30:00', true, NOW(), NOW()),
  (9, '2025-07-31', '11:30:00', '12:00:00', true, NOW(), NOW()),
  (9, '2025-07-31', '15:00:00', '15:30:00', true, NOW(), NOW()),
  (9, '2025-07-31', '15:30:00', '16:00:00', true, NOW(), NOW()),
  (9, '2025-07-31', '16:00:00', '16:30:00', true, NOW(), NOW())
ON CONFLICT ("doctorId", date, "startTime") DO NOTHING;

-- Verify the insertions
SELECT date, "startTime", "endTime", "isAvailable" 
FROM "timeSlots" 
WHERE "doctorId" = 9 AND date = '2025-07-31' 
ORDER BY "startTime";