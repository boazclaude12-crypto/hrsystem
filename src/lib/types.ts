export type AppRole = "admin" | "hr" | "manager" | "employee";
export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";
export type EmploymentStatus = "active" | "on_leave" | "suspended" | "terminated";
export type AttendanceStatus = "present" | "remote" | "absent" | "holiday" | "leave";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type PayrollStatus = "draft" | "processing" | "paid" | "cancelled";

export type Department = {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
};

export type Employee = {
  id: string;
  user_id: string | null;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: AppRole;
  job_title: string | null;
  department_id: string | null;
  manager_id: string | null;
  employment_type: EmploymentType;
  status: EmploymentStatus;
  hire_date: string;
  termination_date: string | null;
  base_salary: number;
  currency: string;
  created_at: string;
};

export type EmployeeWithRelations = Employee & {
  department: Pick<Department, "id" | "name"> | null;
  manager: Pick<Employee, "id" | "first_name" | "last_name"> | null;
};

export type AttendanceRecord = {
  id: string;
  employee_id: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_minutes: number;
  status: AttendanceStatus;
  notes: string | null;
};

export type LeaveType = {
  id: string;
  code: string;
  name: string;
  default_days_per_year: number;
  is_paid: boolean;
};

export type LeaveBalance = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  entitled_days: number;
  used_days: number;
};

export type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: RequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

export type LeaveRequestWithRelations = LeaveRequest & {
  employee: Pick<Employee, "id" | "first_name" | "last_name" | "employee_number"> | null;
  leave_type: Pick<LeaveType, "id" | "name" | "code" | "is_paid"> | null;
};

export type PayrollPeriod = {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: PayrollStatus;
};

export type Payslip = {
  id: string;
  payroll_period_id: string;
  employee_id: string;
  gross_pay: number;
  tax: number;
  other_deductions: number;
  net_pay: number;
  currency: string;
  notes: string | null;
};

export type PayslipWithEmployee = Payslip & {
  employee: Pick<Employee, "id" | "first_name" | "last_name" | "employee_number"> | null;
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  hr: "HR",
  manager: "Manager",
  employee: "Employee",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  intern: "Intern",
};

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: "Active",
  on_leave: "On leave",
  suspended: "Suspended",
  terminated: "Terminated",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  remote: "Remote",
  absent: "Absent",
  holiday: "Holiday",
  leave: "On leave",
};
