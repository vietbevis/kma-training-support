import { DayOfWeek } from 'src/shared/enums/day-of-week.enum';

export interface DetailTimeSlot {
  dayOfWeek: DayOfWeek; // enum lưu dưới dạng số
  timeSlot: string;
  roomName: string;
  buildingName?: string; // optional
  startDate: string; // ISO format
  endDate: string;
}
