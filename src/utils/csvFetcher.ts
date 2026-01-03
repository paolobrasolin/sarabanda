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
      'Missing required columns. Please ensure your sheet has: image_url',
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
  image_url: number;
  propColumns: Array<{ name: string; index: number }>; // Columns starting with "prop."
  tagColumns: Array<{ name: string; index: number }>; // Columns starting with "tags."
  hasRequiredColumns(): boolean;
}

function createHeaderMap(headers: string[]): HeaderMap {
  const map: Partial<HeaderMap> = {
    propColumns: [],
    tagColumns: [],
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
    } else if (normalized.startsWith('tags.')) {
      // Extract the tag name after "tags."
      const tagName = normalized.substring(5).trim(); // Remove "tags." prefix
      if (tagName) {
        map.tagColumns!.push({ name: tagName, index });
      }
    } else {
      // Handle standard columns
      switch (normalized) {
        case 'image_url':
        case 'image url':
          map.image_url = index;
          break;
      }
    }
  });

  return {
    image_url: map.image_url!,
    propColumns: map.propColumns || [],
    tagColumns: map.tagColumns || [],
    hasRequiredColumns() {
      return map.image_url !== undefined;
    },
  } as HeaderMap;
}

function parseCharacterFromValues(values: string[], headerMap: HeaderMap): Character | null {
  try {
    const imageUrl = values[headerMap.image_url]?.trim() || '';

    // Collect all prop.* columns into a props object
    const props: Record<string, string> = {};
    headerMap.propColumns.forEach((propCol) => {
      const value = values[propCol.index]?.trim() || '';
      if (value) {
        props[propCol.name] = value;
      }
    });

    // Collect all tags.* columns into a tags object
    // Split by comma (with optional whitespace) to support multiple values
    const tags: Record<string, string[]> = {};
    headerMap.tagColumns.forEach((tagCol) => {
      const value = values[tagCol.index]?.trim() || '';
      if (value) {
        // Split by comma with optional whitespace, then trim each value
        const tagValues = value.split(/\s*,\s*/).map((v) => v.trim()).filter((v) => v.length > 0);
        if (tagValues.length > 0) {
          tags[tagCol.name] = tagValues;
        }
      }
    });

    // Skip empty rows (if no props, no tags, and no image, consider it empty)
    if (Object.keys(props).length === 0 && Object.keys(tags).length === 0 && !imageUrl) {
      return null;
    }

    return {
      props,
      tags,
      image_url: imageUrl,
    };
  } catch (error) {
    throw new Error(`Failed to parse character: ${error}`);
  }
}
