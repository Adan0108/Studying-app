import { TimeEntry, ITimeEntry } from "../models/timeEntry.model";
import mongoose from "mongoose";

const PAGE_SIZE = 10;

export interface PaginatedTime {
  entries: ITimeEntry[];
  total: number;
  page: number;
  pages: number;
}

/**
 * Record a working session with a given duration in seconds.
 */
export async function createTimeEntry(
  userId: string,
  workingDurationSec: number
): Promise<ITimeEntry> {
  const entry = new TimeEntry({
    user: new mongoose.Types.ObjectId(userId),
    workingDuration: workingDurationSec,
  });
  return entry.save();
}

/**
 * Get paginated history of working durations.
 */
export async function getTimeHistoryPaginated(
  userId: string,
  page: number = 1
): Promise<PaginatedTime> {
  const filter = { user: userId };
  const total = await TimeEntry.countDocuments(filter).exec();
  const pages = Math.ceil(total / PAGE_SIZE);
  const entries = await TimeEntry.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .exec();

  return { entries, total, page, pages };
}
