// Shared utility function to calculate health profile completion percentage
export const calculateHealthProfileCompletion = (healthProfile: any): number => {
  if (!healthProfile) return 0;
  
  const basicFields = [
    healthProfile.dateOfBirth,
    healthProfile.gender,
    healthProfile.height,
    healthProfile.weight,
    healthProfile.bloodType,
    healthProfile.emergencyContactName,
    healthProfile.emergencyContactPhone,
  ];
  
  const arrayFields = [
    healthProfile.allergies,
    healthProfile.medications,
    healthProfile.medicalHistory,
  ];
  
  // Count filled basic fields (strings)
  const filledBasicFields = basicFields.filter(field => field && String(field).trim() !== '').length;
  
  // Count filled array fields (arrays with at least one item)
  const filledArrayFields = arrayFields.filter(field => field && Array.isArray(field) && field.length > 0).length;
  
  const totalFields = basicFields.length + arrayFields.length;
  const totalFilledFields = filledBasicFields + filledArrayFields;
  
  return Math.round((totalFilledFields / totalFields) * 100);
};