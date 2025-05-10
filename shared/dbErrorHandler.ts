export const constraintMessages: Record<string, string> = {
  properties_pkey: "Property-id not unique, please check database",

  properties_flat_number_key:
    "Property Flat Number is already registered. Kindly delete or modify accordingly as needed.",

  unique_nestaway_id_when_present:
    "Property Nestaway id already in use. Kindly delete or modify accordingly as needed.",

  expenses_pkey: "expense-id not unique, please check database.",

  expenses_property_id_fkey: "expense-id not unique, please check database.",

  expenses_created_by_fkey: "Entered property is missing in properties table.",

  unique_expense_entry: "Entered expense is a duplicate entry.",

  unique_income_entry: "Entered income is a duplicate entry.",

  unique_maint_entry: "Entered maintenance record is a duplicate entry.",

  unique_flat_number_active_idx: "Another Tenant already active for this flat.",

  unique_flat_number: "Another property already exists with this flat number.",

  check_recent_duplicate_property_charge:
    "Similar property charge already exists for this flat within a month ago.",

  unique_tenant_per_flat: "Same tenant already exists for this flat.",

  unique_vendor_vendorinfo: "Vendor already exists with the same details.",

  prevent_another_income_within_29_days:
    "Another income entry already exists within last 29 days.",
};

export const triggerMessages: Record<string, string> = {
  prevent_another_income_within_29_days:
    "An income of type rent for property ID 2 already exists within the last 29 days",

  prevent_recent_duplicate_property_charge:
    "A similar property charge already exists for this flat within the last month.",
};

export function getConstraintErrorMessage(error: any): string {
  if (error?.constraint && constraintMessages[error.constraint]) {
    console.log(
      "In db Handler now, error message is :",
      constraintMessages[error.constraint],
    );
    return constraintMessages[error.constraint];
  }
  if (typeof error.message === "string") {
    for (const fn in triggerMessages) {
      if (error.message.includes(fn)) {
        console.log(
          "In db Handler now, error message is :",
          triggerMessages[fn],
        );
        return triggerMessages[fn];
      }
    }
  }

  return "A database error occurred. Please check the entered data or try again later.";
}
