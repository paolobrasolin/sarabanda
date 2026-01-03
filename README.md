# Sarabanda

A web-based game master control system for character guessing games. Sarabanda allows you to load characters from a Google Spreadsheet and manage game rounds, scoring, and player interactions.

## Overview

Sarabanda consists of two main screens:
- **Remote Screen**: Game Master control interface (for managing the game)
- **Player Screen**: Display screen for players (read-only, shows current character)

## Getting Started

### 1. Prepare Your Google Spreadsheet

Your Google Spreadsheet must be **publicly accessible** (set sharing to "Anyone with the link can view"). The spreadsheet should contain character data with specific column naming conventions.

#### Required Columns

- **`image_url`** (required): URL to an image of the character. This is the only truly required column.

#### Property Columns (`prop.*`)

Columns starting with `prop.` are used for display purposes only (not for filtering). These can be any number of columns with names like:
- `prop.given_names`
- `prop.family_names`
- `prop.nickname`
- `prop.title`
- etc.

**Example:**
- Column name: `prop.given_names` → Displayed as "Given Names"
- Column name: `prop.family_names` → Displayed as "Family Names"

The system automatically converts snake_case column names to Title Case for display (e.g., `family_names` → "Family Names").

#### Tag Columns (`tags.*`)

Columns starting with `tags.` are used for filtering and can have **multiple comma-separated values**. These are essential for game configuration.

**Common tag columns:**
- `tags.category` - Character category (e.g., "Movies", "TV Shows", "Books")
- `tags.difficulty` - Difficulty level (e.g., "Easy", "Medium", "Hard")
- `tags.genre` - Genre classification
- `tags.era` - Time period
- etc.

**Multiple values:** You can specify multiple values in a single cell by separating them with commas:
- Example: `"Action, Adventure, Sci-Fi"` will be parsed as three separate values
- Whitespace around commas is automatically trimmed
- Example: `"Action,Adventure, Sci-Fi"` works the same way

**Filtering:** The game master can select which tag values to include in the game. Characters match if **any** of their tag values match **any** of the selected values (OR logic within a tag), and they must match **all** tag filters (AND logic across tags).

#### Example Spreadsheet Structure

| image_url | prop.given_names | prop.family_names | tags.category | tags.difficulty | tags.genre |
|-----------|------------------|-------------------|---------------|-----------------|------------|
| https://example.com/img1.jpg | John | Doe | Movies | Easy | Action, Adventure |
| https://example.com/img2.jpg | Jane | Smith | TV Shows | Medium | Drama, Comedy |
| https://example.com/img3.jpg | Bob | Johnson | Books | Hard | Sci-Fi, Fantasy |

### 2. Load Characters

1. Open the **Remote Screen** (click "Remote" on the splash screen)
2. Click the **"People"** button
3. Paste your Google Spreadsheet URL in the input field
4. Click **"Load"**
5. The system will:
   - Fetch and parse the spreadsheet
   - Display all loaded characters in a table
   - Automatically initialize tag filters with all available values selected

**Note:** The spreadsheet must be publicly accessible. If you get an error, check that:
- The spreadsheet is shared with "Anyone with the link can view"
- The URL is correct
- The spreadsheet has the required columns

### 3. Configure the Game

Click the **"Config"** button in the Remote Screen to configure:

- **Number of Teams**: Set how many teams are playing
- **Team Names**: Customize team names
- **Free Turn Duration**: Time limit for free-for-all rounds (in seconds)
- **Turn Durations**: Time limit for each team's turn (in seconds)
- **Free Turn Score**: Points awarded in free-for-all rounds
- **Turn Scores**: Points awarded for each team's turn

### 4. Select Tag Filters

In the Remote Screen, you'll see dynamic selectors for each `tags.*` column found in your spreadsheet:

- **Category selector**: Choose which categories to include
- **Difficulty selector**: Choose which difficulty levels to include
- **Other tag selectors**: Any other `tags.*` columns will have their own selectors

**Filtering logic:**
- Characters must match **all** selected tag filters to be available
- Within each tag, a character matches if **any** of its tag values match **any** of the selected values
- If no values are selected for a tag, that tag doesn't filter (all values are included)

**Example:**
- Selected categories: ["Movies", "TV Shows"]
- Selected difficulties: ["Easy", "Medium"]
- A character with `tags.category = ["Movies"]` and `tags.difficulty = ["Easy", "Hard"]` will match (has "Movies" and "Easy")

### 5. Start the Game

1. Ensure characters are loaded and tag filters are configured
2. Click **"Start"** in the Remote Screen
3. The game will:
   - Randomly select a character matching your filters
   - Enter the "Choosing" phase where you can review the character
   - Show available character count

### 6. Managing Rounds

#### Choosing Phase

After starting, you'll be in the "Choosing" phase:

- **Review the character**: Check the character preview to ensure it's correct
- **Re-roll**: Click "Re-roll" to get a different character (if available)
- **Confirm**: Click "Confirm" to proceed to the guessing phase

**Note:** You can only confirm if the character matches your current tag filters.

#### Guessing Phase

Once confirmed, the game enters the "Guessing" phase:

- **Start Timer**: Click "Start Timer" to begin the countdown
- **Team Turns**: The system automatically rotates through teams
- **Free-for-All**: After all teams have had a turn, it switches to free-for-all mode

**Awarding Points:**

- **Team Mode**: Click "Award Points" for correct answers, "No Points" for incorrect/timeout
- **Free-for-All Mode**: 
  - Select the winning team from the dropdown
  - Click "Award Points" to award to that team
  - Click "No Points" if no one got it

**Timer:**
- Timer automatically stops when points are awarded
- If timer expires, you can still award points manually

### 7. Round Completion

After awarding points (or no points), the round completes automatically:

- Character is marked as used (won't appear again)
- Round is added to the game history
- Game moves to the next round's "Choosing" phase
- Scores are updated automatically

### 8. Viewing Scores

The **Scores** section shows:

- **Round-by-round breakdown**: Each round with character and scores per team
- **Editable scores**: You can manually adjust scores by clicking on them
- **Total scores**: Automatically calculated sum of all rounds

**Score editing:**
- Click on any score cell to edit
- Supports decimal values (e.g., 0.5, 1.5)
- Changes are saved immediately
- Total scores update automatically

### 9. Ending the Game

- Click **"End"** to stop the current game
- Game enters "Stopped" phase
- Click **"Reset"** to clear all game data and return to setup

**Note:** "Reset" only clears game state, not loaded characters or configuration.

## Advanced Features

### Character Tracking

- Characters are automatically marked as "used" after each round
- Used characters won't appear in future rounds
- View used status in the People dialog table (marked with ✓)
- Click "Reset Used" in People dialog to mark all characters as available again

### Available Character Count

The Remote Screen shows:
- **Filtered available**: Characters matching current tag filters that haven't been used
- **Filtered total**: Total characters matching current tag filters
- **Unfiltered counts**: All characters (regardless of filters)

### Multiple Tag Values

When a character has multiple values for a tag (comma-separated in the spreadsheet):
- All values are displayed (e.g., "Action, Adventure, Sci-Fi")
- Character matches if **any** of its values match **any** selected value
- Example: Character with `tags.genre = ["Action", "Adventure"]` matches if you select either "Action" or "Adventure"

### Hard Reset

If the app is crashing or behaving unexpectedly (e.g., after a schema change):

1. Go to the Splash Screen
2. Click "do a hard reset" in the help text
3. Confirm the reset
4. All localStorage data will be cleared
5. The page will reload

**Warning:** This will delete all game data, characters, and configuration. You'll need to reload your spreadsheet.

## Tips for Game Masters

1. **Prepare your spreadsheet carefully**: Ensure all required columns are present and data is clean
2. **Test tag filters**: Before starting, verify that your tag selections return the expected characters
3. **Use multiple tag values**: Add multiple genres/categories to characters to make them more flexible
4. **Monitor available characters**: Keep an eye on the available count to know when you're running low
5. **Adjust scores as needed**: Don't hesitate to manually adjust scores if needed during the game
6. **Save your spreadsheet URL**: Keep the URL handy in case you need to reload characters

## Troubleshooting

### Characters not loading

- Check that the spreadsheet is publicly accessible
- Verify the URL is correct
- Ensure required columns (`image_url`) are present
- Check browser console for errors

### No characters available

- Check your tag filter selections
- Verify characters match your selected tag values
- Check if all characters have been used (click "Reset Used" if needed)

### App crashes or errors

- Try a hard reset (see above)
- Check browser console for error messages
- Ensure you're using a modern browser

### Timer not working

- Timer is based on timestamps, so it should work even if the page is refreshed
- If timer seems stuck, try stopping and restarting it

## Technical Details

- **Storage**: All data is stored in browser localStorage
- **Synchronization**: Remote and Player screens sync via localStorage events
- **Data format**: Characters use dynamic `props` and `tags` objects
- **Filtering**: Tag-based filtering with AND/OR logic as described above

## Support

For issues or questions, please check the GitHub repository or open an issue.
