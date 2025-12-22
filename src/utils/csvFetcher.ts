import type { Character } from './types';

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
      'Missing required columns. Please ensure your sheet has: family_names, given_names, category, difficulty, image_url, hints',
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
  family_names: number;
  given_names: number;
  category: number;
  difficulty: number;
  image_url: number;
  hints: number;
  hasRequiredColumns(): boolean;
}

function createHeaderMap(headers: string[]): HeaderMap {
  const map: Partial<HeaderMap> = {};

  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().trim();
    switch (normalized) {
      case 'family_names':
      case 'family names':
        map.family_names = index;
        break;
      case 'given_names':
      case 'given names':
        map.given_names = index;
        break;
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
      case 'hints':
        map.hints = index;
        break;
    }
  });

  return {
    ...map,
    hasRequiredColumns() {
      return (
        map.family_names !== undefined &&
        map.given_names !== undefined &&
        map.category !== undefined &&
        map.difficulty !== undefined &&
        map.image_url !== undefined &&
        map.hints !== undefined
      );
    },
  } as HeaderMap;
}

function parseCharacterFromValues(values: string[], headerMap: HeaderMap): Character | null {
  try {
    const familyNames = values[headerMap.family_names]?.trim() || '';
    const givenNames = values[headerMap.given_names]?.trim() || '';
    const category = values[headerMap.category]?.trim() || '';
    const difficultyStr = values[headerMap.difficulty]?.trim() || '1';
    const imageUrl = values[headerMap.image_url]?.trim() || '';
    const hintsStr = values[headerMap.hints]?.trim() || '';

    // Skip empty rows
    if (!familyNames && !givenNames) {
      return null;
    }

    // Parse difficulty
    const difficulty = parseFloat(difficultyStr);
    if (isNaN(difficulty) || difficulty < 0) {
      throw new Error(`Invalid difficulty: ${difficultyStr}`);
    }

    // Parse hints (split by colons)
    const hints = hintsStr
      .split(':')
      .map((hint) => hint.trim())
      .filter((hint) => hint.length > 0);

    return {
      family_names: familyNames,
      given_names: givenNames,
      category: category || 'Uncategorized',
      difficulty: difficulty,
      image_url: imageUrl,
      hints: hints.length > 0 ? hints : ['No hints available'],
    };
  } catch (error) {
    throw new Error(`Failed to parse character: ${error}`);
  }
}
