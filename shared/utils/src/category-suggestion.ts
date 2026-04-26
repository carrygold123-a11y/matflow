import { materialCategories } from './constants/material-categories';

const keywordMap: Record<string, string> = {
  beton: 'Concrete',
  concrete: 'Concrete',
  boden: 'Groundwork',
  erde: 'Groundwork',
  sand: 'Groundwork',
  kies: 'Groundwork',
  schotter: 'Groundwork',
  asphalt: 'Groundwork',
  pflaster: 'Groundwork',
  gravel: 'Groundwork',
  soil: 'Groundwork',
  paving: 'Groundwork',
  steel: 'Steel',
  stahl: 'Steel',
  wood: 'Wood',
  timber: 'Wood',
  holz: 'Wood',
  insulation: 'Insulation',
  daemmung: 'Insulation',
  tile: 'Tiles',
  fliesen: 'Tiles',
  cable: 'Electrical',
  kabel: 'Electrical',
  pipe: 'Plumbing',
  rohr: 'Plumbing',
  paint: 'Paint',
  farbe: 'Paint',
  drywall: 'Drywall',
  gips: 'Drywall',
  tool: 'Tools',
  werkzeug: 'Tools',
};

export function suggestCategory(input: string): string {
  const normalizedInput = input.toLowerCase();
  const match = Object.entries(keywordMap).find(([keyword]) => normalizedInput.includes(keyword));

  if (match) {
    return match[1];
  }

  return materialCategories[0];
}
