export const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/;

export function formatCNIC(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function validateCNIC(cnic: string): boolean {
  return CNIC_REGEX.test(cnic);
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 11 && /^03\d{9}$/.test(cleaned);
}

export function formatPhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(0, 11);
}

export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export const MIN_PLAYER_AGE = 13;

export function isEligibleAge(age: number | undefined): boolean {
  return typeof age === 'number' && age > 12;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'APPROVED':
      return '#A3CF2D';
    case 'PENDING':
      return '#F59E0B';
    case 'REJECTED':
      return '#EF4444';
    default:
      return '#9CA39C';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'Approved';
    case 'PENDING':
      return 'Pending Review';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status;
  }
}

export function getCategoryLabel(category?: string | null): string {
  switch (category) {
    case 'JUNIOR':
      return 'Junior';
    case 'SENIOR':
      return 'Senior';
    case 'EMERGING':
      return 'Emerging';
    default:
      return 'Unassigned';
  }
}

export function getKitSizeLabel(size?: string | null): string {
  switch (size) {
    case 'S':
      return 'Small';
    case 'M':
      return 'Medium';
    case 'L':
      return 'Large';
    case 'XL':
      return 'XL';
    case '2XL':
      return '2XL';
    case '3XL':
      return '3XL';
    case '4XL':
      return '4XL';
    default:
      return 'Not selected';
  }
}
