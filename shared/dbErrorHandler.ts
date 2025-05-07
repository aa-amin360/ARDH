export const constraintMessages: Record<string, string> = {
  properties_pkey: "Property-id not unique, please check database",

  properties_flat_number_key:
    "Property Flat Number is already registered. Kindly delete or modify accordingly as needed.",

  unique_nestaway_id:
    "Property Nestaway id already in use. Kindly delete or modify accordingly as needed.",

  expenses_pkey: "expense-id not unique, please check database.",

  expenses_property_id_fkey: "expense-id not unique, please check database.",

  expenses_created_by_fkey: "Entered property is missing in properties table.",

  unique_expense_entry: "Entered expense is a duplicate entry.",

  unique_income_entry: "Entered income is a duplicate entry.",

  unique_maint_entry: "Entered maintenance record is a duplicate entry.",

  unique_flat_number_active_idx: "Another Tenant already active for this flat.",
};

export function getConstraintErrorMessage(error: any): string {
  if (error?.constraint && constraintMessages[error.constraint]) {
    return constraintMessages[error.constraint];
  }

  return "A database error occurred. Please check the entered data or try again later.";
}
