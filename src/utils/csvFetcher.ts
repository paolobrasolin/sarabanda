import type { Character } from '../types';

export interface CsvFetchResult {
  success: boolean;
  data?: Character[];
  error?: string;
}

export async function fetchCharactersFromGoogleSheet(url: string): Promise<CsvFetchResult> {
  try {
    // Validate URL
    if (!url || !url.includes('docs.google.com/spreadsheets')) {
      return {
        success: false,
        error: 'Please provide a valid Google Sheets URL',
      };
    }

    // Convert Google Sheets URL to CSV export URL
    const csvUrl = convertToCsvUrl(url);

    const response = await fetch(csvUrl);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch data: ${response.status} ${response.statusText}`,
      };
    }

    const csvText = await response.text();
    const characters = parseCsvToCharacters(csvText);

    if (characters.length === 0) {
      return {
        success: false,
        error: 'No valid characters found in the sheet',
      };
    }

    return {
      success: true,
      data: characters,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

function convertToCsvUrl(googleSheetsUrl: string): string {
  // Extract spreadsheet ID from Google Sheets URL
  const match = googleSheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error('Invalid Google Sheets URL format');
  }

  const spreadsheetId = match[1];
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`;
}

function parseCsvToCharacters(csvText: string): Character[] {
  const lines = csvText.split('\n').filter((line) => line.trim());
  if (lines.length < 2) {
    return [];
  }

  // Parse header row to find column indices
  const headers = parseCsvLine(lines[0]);
  const headerMap = createHeaderMap(headers);

  if (!headerMap.hasRequiredColumns()) {
    throw new Error(
      'Missing required columns. Please ensure your sheet has: category, difficulty, image_url',
    );
  }

  const characters: Character[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCsvLine(lines[i]);
      const character = parseCharacterFromValues(values, headerMap);
      if (character) {
        characters.push(character);
      }
    } catch (error) {
      console.warn(`Skipping invalid row ${i + 1}:`, error);
    }
  }

  return characters;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

interface HeaderMap {
  category: number;
  difficulty: number;
  image_url: number;
  propColumns: Array<{ name: string; index: number }>; // Columns starting with "prop."
  hasRequiredColumns(): boolean;
}

function createHeaderMap(headers: string[]): HeaderMap {
  const map: Partial<HeaderMap> = {
    propColumns: [],
  };

  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().trim();
    
    // Check if it's a prop column (starts with "prop.")
    if (normalized.startsWith('prop.')) {
      // Extract the property name after "prop."
      const propName = normalized.substring(5).trim(); // Remove "prop." prefix
      if (propName) {
        map.propColumns!.push({ name: propName, index });
      }
    } else {
      // Handle standard columns
      switch (normalized) {
        case 'category':
          map.category = index;
          break;
        case 'difficulty':
          map.difficulty = index;
          break;
        case 'image_url':
        case 'image url':
          map.image_url = index;
          break;
      }
    }
  });

  return {
    category: map.category!,
    difficulty: map.difficulty!,
    image_url: map.image_url!,
    propColumns: map.propColumns || [],
    hasRequiredColumns() {
      return (
        map.category !== undefined &&
        map.difficulty !== undefined &&
        map.image_url !== undefined
      );
    },
  } as HeaderMap;
}

function parseCharacterFromValues(values: string[], headerMap: HeaderMap): Character | null {
  try {
    const category = values[headerMap.category]?.trim() || '';
    const difficulty = values[headerMap.difficulty]?.trim() || '';
    const imageUrl = values[headerMap.image_url]?.trim() || '';

    // Collect all prop.* columns into a props object
    const props: Record<string, string> = {};
    headerMap.propColumns.forEach((propCol) => {
      const value = values[propCol.index]?.trim() || '';
      if (value) {
        props[propCol.name] = value;
      }
    });

    // Skip empty rows (if no props and no category/difficulty, consider it empty)
    // At minimum, we need category or difficulty to have a valid character
    if (Object.keys(props).length === 0 && !category && !difficulty) {
      return null;
    }

    return {
      props,
      category: category || 'Uncategorized',
      difficulty: difficulty,
      image_url: imageUrl,
    };
  } catch (error) {
    throw new Error(`Failed to parse character: ${error}`);
  }
}
