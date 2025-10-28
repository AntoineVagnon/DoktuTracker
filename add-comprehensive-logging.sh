#!/bin/bash

# Add component mount logging
sed -i '115 a\  console.log("[GOOGLE_CAL] Component mounted with doctorId:", doctorId, "isPatientView:", isPatientView);' client/src/components/GoogleStyleCalendar.tsx

# The delete mutation logging is already there from commit 3d0e8f1
# But let's verify it's still there
grep -q "\[DELETE\] Starting delete" client/src/components/GoogleStyleCalendar.tsx && echo "Delete logging already present" || echo "WARNING: Delete logging missing!"

