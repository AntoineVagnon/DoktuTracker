// Shared utility function to calculate health profile completion percentage
export const calculateHealthProfileCompletion = (healthProfile: any): number => {
  if (!healthProfile) return 0;
  
  const basicFields = [
    healthProfile.dateOfBirth,
    healthProfile.gender,
    healthProfile.height,
    healthProfile.weight,
    healthProfile.bloodType,
  ];
  
  // Array fields with N/A support
  const arrayFieldsWithNA = [
    { field: healthProfile.allergies, notApplicable: healthProfile.allergiesNotApplicable },
    { field: healthProfile.medications, notApplicable: healthProfile.medicationsNotApplicable },
    { field: healthProfile.medicalHistory, notApplicable: healthProfile.medicalHistoryNotApplicable },
  ];
  
  // Emergency contact fields (treated as one unit)
  const hasEmergencyContact = healthProfile.emergencyContactName || healthProfile.emergencyContactPhone;
  const emergencyContactNotApplicable = healthProfile.emergencyContactNotApplicable;
  
  // Count filled basic fields (strings)
  const filledBasicFields = basicFields.filter(field => field && String(field).trim() !== '').length;
  
  // Count filled or N/A array fields
  const completedArrayFields = arrayFieldsWithNA.filter(({ field, notApplicable }) => {
    return notApplicable || (field && Array.isArray(field) && field.length > 0);
  }).length;
  
  // Count emergency contact as complete if filled or marked N/A
  const emergencyContactComplete = emergencyContactNotApplicable || hasEmergencyContact ? 1 : 0;
  
  const totalFields = basicFields.length + arrayFieldsWithNA.length + 1; // +1 for emergency contact
  const totalCompletedFields = filledBasicFields + completedArrayFields + emergencyContactComplete;
  
  return Math.round((totalCompletedFields / totalFields) * 100);
};