export type SectionKey = 'restaurants' | 'dates' | 'winter' | 'home';
export type TravelTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';

export interface RestaurantItem {
  id: string;
  row?: number;
  name: string;
  cuisine: string;
  area: string;
  travel: string;
  travelMins: number;
  travelTier: TravelTier;
  romance: number;
  budget: number | null;
  occasion: string;
  booking: string;
  mustTry: string;
  status: string;
  linkLabel: string;
  linkUrl: string;
  notes: string;
  rating: number | null;
}

export interface DateIdeaItem {
  id: string;
  row?: number;
  name: string;
  kind: string;
  area: string;
  travel: string;
  travelMins: number;
  travelTier: TravelTier;
  romance: number;
  budget: number | null;
  timeNeeded: string;
  setting: string;
  bestMoment: string;
  status: string;
  linkLabel: string;
  linkUrl: string;
  notes: string;
  rating: number | null;
}

export interface WinterItem {
  id: string;
  row?: number;
  item: string;
  entryType: string;
  forWho: string;
  storeOrPiece: string;
  requirements: string;
  price: number | null;
  area: string;
  priority: string;
  status: string;
  linkLabel: string;
  linkUrl: string;
  notes: string;
}

export interface HomeItem {
  id: string;
  row?: number;
  item: string;
  room: string;
  when: string;
  priority: string;
  budget: number | null;
  store: string;
  who: string;
  details: string;
  status: string;
  linkLabel: string;
  linkUrl: string;
  notes: string;
}

export interface AppData {
  spreadsheetUrl: string;
  spreadsheetId: string;
  restaurants: RestaurantItem[];
  dates: DateIdeaItem[];
  winter: WinterItem[];
  home: HomeItem[];
}

export interface SyncConfig {
  endpointUrl: string;
  passcode: string;
}
