# Quiz Game Project Specification

## Overview
A static web application for hosting a team-based quiz game where players guess characters from a public Google Sheet. The game is designed to be displayed on a shared screen and managed by a Game Master (GM). The interface is optimized for projectors and TVs with high contrast design for visibility in various lighting conditions.

## Core Features

### Game Configuration
- **Google Sheet URL**: Public CSV export URL containing character data
- **Number of Rounds**: Configurable total rounds per game (auto-calculated max based on available characters)
- **Round Duration**: Timer for guessing phase (configurable)
- **Team Configuration**:
  - Custom team names (default: "Team A", "Team B")
  - Support for 2+ teams (configurable)
- **Difficulty Range**: Min/max difficulty filter for character selection
- **Character Selection Mode**: True random or increasing difficulty
- **Scoring System**: Configurable point values for different scenarios
- **Auto-save**: Game state saved to localStorage for crash recovery
- **Used Characters Tracking**: Characters marked as used across games (localStorage)

### Data Structure
Google Sheet must contain these columns (case-insensitive):
- `family_names`: Character's family name
- `given_names`: Character's given name
- `category`: Character category/topic
- `difficulty`: Positive numeric difficulty level
- `image_url`: URL to character photo
- `hints`: Three hints separated by colons

Additional columns are ignored. All fields should be strings.

**Data Validation:**
- Difficulty range is automatically determined from loaded data
- Broken image URLs show placeholder image
- Malformed hints (missing colons, empty) show placeholder text
- Data is loaded once at game start and cached locally

### Game Flow

#### Pre-Game
1. Load and validate Google Sheet data
2. Display configuration screen with:
   - Google Sheet URL input
   - Team name configuration
   - Round count and duration settings
   - Difficulty range settings
   - Scoring system configuration
3. Show data validation status and character count

#### Per Round
1. **Category Selection**: Team picks from available categories
   - Categories shown as selectable boxes
   - Exhausted categories visually disabled
   - Progress indicator (n/n characters remaining)
   - Maximum rounds automatically calculated based on available characters
2. **Character Display**: Random character from selected category
   - Photo fills screen (maintain aspect ratio)
   - Character name hidden until guessed
   - QR code displayed for GM reference
   - Character selection: true random (configurable to increasing difficulty)
   - Character marked as used after display
3. **Guessing Phase**:
   - Timer visible to all players
   - Team A attempts first (configurable points)
   - Team B attempts second (configurable points)
   - Free-for-all phase with hints
   - GM can reveal hints one at a time
   - GM can pause timer during explanations
   - GM can award scores via quick buttons (0.5, 1, 1.5, 2 points) + custom input
4. **Scoring**: Points awarded based on configuration
5. **Round End**: Category marked as exhausted if no characters remain

#### Game End
- Display final scores
- Show winner
- Option to start new game

## User Interface

### Game Master Controls
- **Pause/Resume**: Control round timing
- **Skip Round**: Move to next round
- **Restart Round**: Reset current round
- **Hint Reveal**: Show hints one at a time
- **Score Adjustment**: Quick buttons (0.5, 1, 1.5, 2 points) + custom input
- **Character QR**: Quick reference for character name
- **Game History**: Editable table showing all rounds and scores
- **Timer Pause**: Pause timer during explanations
- **Character Reveal**: Show character name when guessed or timer expires

### Display Features
- **Full-screen Mode**: Optimized for projectors/TVs
- **High Contrast**: Readable on various displays (colorblind-friendly)
- **Responsive Layout**: Adapts to different screen sizes
- **Timer Display**: Visible countdown for guessing phase
- **Score Board**: Real-time team scores
- **Category Progress**: Visual indicators for remaining characters
- **Turn Indicators**: Clear visual indication of current team's turn
- **Image Placeholders**: Fallback for broken image URLs

### Error Handling
- **Data Loading**: Clear error messages for invalid URLs
- **Format Validation**: Explain required Google Sheet structure
- **Network Issues**: Graceful handling of connection problems
- **State Recovery**: Auto-restore from localStorage on page refresh
- **Timer Expiry**: Pause for GM decision (no auto-actions)
- **Data Caching**: Load once at game start, cache locally
- **Image Loading**: Placeholder for broken image URLs
- **Character Exhaustion**: Clear indication when no characters remain

## Technical Requirements

### Frontend
- **Framework**: React with TypeScript
- **Styling**: CSS with high contrast theme
- **State Management**: Local state with localStorage persistence
- **QR Code**: Library for generating character reference codes
- **Timer**: Precise countdown functionality

### Data Processing
- **CSV Parsing**: Handle Google Sheet CSV export
- **Data Validation**: Verify required columns and data types
- **Character Filtering**: Apply difficulty range and category filters
- **Random Selection**: Fair character selection algorithm

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Support**: Responsive design for various screen sizes
- **UTF-8 Support**: Handles international character names
- **Local Storage**: Required for game state persistence

## Implementation Tasks

### Phase 1: Core Infrastructure
- [ ] Set up React project with TypeScript
- [ ] Create basic project structure and routing
- [ ] Implement Google Sheets CSV fetching
- [ ] Add data validation and error handling
- [ ] Create basic UI components

### Phase 2: Game Configuration
- [ ] Build configuration screen with all settings
- [ ] Implement team management system
- [ ] Add difficulty range filtering
- [ ] Create scoring system configuration
- [ ] Add character selection mode (random vs increasing difficulty)
- [ ] Add localStorage persistence
- [ ] Implement used characters tracking

### Phase 3: Game Flow
- [ ] Implement category selection interface
- [ ] Create character display with photo
- [ ] Add timer functionality
- [ ] Build guessing phase logic
- [ ] Implement scoring system
- [ ] Add character marking as used
- [ ] Implement turn indicators

### Phase 4: Game Master Controls
- [ ] Add pause/resume functionality
- [ ] Implement hint reveal system (one at a time)
- [ ] Create scoring interface (quick buttons + custom input)
- [ ] Add QR code generation
- [ ] Build round management controls
- [ ] Implement game history table (editable)
- [ ] Add timer pause during explanations
- [ ] Add character reveal functionality

### Phase 5: UI Polish
- [ ] Design high-contrast theme (colorblind-friendly)
- [ ] Implement full-screen mode
- [ ] Add responsive layouts
- [ ] Create progress indicators
- [ ] Add turn indicators
- [ ] Implement image placeholders
- [ ] Add animations and transitions

### Phase 6: Testing & Polish
- [ ] Test with various Google Sheet formats
- [ ] Validate on different screen sizes
- [ ] Test crash recovery functionality
- [ ] Performance optimization
- [ ] Documentation and deployment

## Success Criteria
- [ ] Successfully loads data from public Google Sheets
- [ ] Supports 2+ teams with custom names
- [ ] Configurable difficulty ranges and scoring
- [ ] Smooth game flow with GM controls
- [ ] Works reliably on projectors and TVs
- [ ] Handles errors gracefully with clear user feedback
- [ ] Auto-saves game state for crash recovery
- [ ] Tracks used characters across games
- [ ] Provides clear visual feedback for all game states
- [ ] Maintains high contrast design for various display conditions
