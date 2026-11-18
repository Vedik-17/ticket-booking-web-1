import { Event, EventCategory, EventStatus } from '@firefly/shared-types';

export interface EventFilterOptions {
  category?: EventCategory;
  searchQuery?: string;
  city?: string;
  status?: EventStatus;
  featuredOnly?: boolean;
}

export class EventEngine {
  /**
   * Filters events by search query, category, city, and status
   */
  public static filterEvents(events: Event[], options: EventFilterOptions = {}): Event[] {
    return events.filter((event) => {
      if (options.status && event.status !== options.status) {
        return false;
      }
      if (options.category && event.category !== options.category) {
        return false;
      }
      if (options.featuredOnly && !event.featured) {
        return false;
      }
      if (options.city && event.venue.city.toLowerCase() !== options.city.toLowerCase()) {
        return false;
      }
      if (options.searchQuery && options.searchQuery.trim() !== '') {
        const query = options.searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesDesc = event.description.toLowerCase().includes(query);
        const matchesVenue = event.venue.name.toLowerCase().includes(query);
        const matchesCity = event.venue.city.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesVenue && !matchesCity) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Sorts events chronologically by start date
   */
  public static sortEventsByDate(events: Event[], ascending = true): Event[] {
    return [...events].sort((a, b) => {
      const timeA = new Date(a.schedule.startsAt).getTime();
      const timeB = new Date(b.schedule.startsAt).getTime();
      return ascending ? timeA - timeB : timeB - timeA;
    });
  }

  /**
   * Validates if an event can transition to a target status
   */
  public static canTransitionStatus(current: EventStatus, next: EventStatus): boolean {
    const validTransitions: Record<EventStatus, EventStatus[]> = {
      DRAFT: ['PUBLISHED', 'CANCELLED'],
      PUBLISHED: ['POSTPONED', 'CANCELLED', 'COMPLETED'],
      POSTPONED: ['PUBLISHED', 'CANCELLED'],
      CANCELLED: [], // terminal
      COMPLETED: [], // terminal
    };
    return validTransitions[current]?.includes(next) ?? false;
  }

  /**
   * Checks if an event is currently accepting bookings
   */
  public static isBookingOpen(event: Event): boolean {
    if (event.status !== 'PUBLISHED') return false;
    const now = new Date().getTime();
    const eventEnd = new Date(event.schedule.endsAt).getTime();
    return now < eventEnd;
  }
}
