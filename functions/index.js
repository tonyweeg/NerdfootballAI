const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

// IMPORTANT: Set your Sportradar API key in your Firebase environment
// In your terminal, run:
// firebase functions:config:set sportradar.key="9uOKa67JWnykZuc8kK3vSvD9Vo3MuSZ2EBkYC8Ll"
const API_KEY = functions.config().sportradar.key;

exports.getScheduleForWeek = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated to prevent abuse
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const week = data.week || 1;
  const year = 2025; // This can be made dynamic in a future version
  const seasonType = "REG";

  const url = `https://api.sportradar.us/nfl/official/trial/v7/en/games/${year}/${seasonType}/${week}/schedule.json?api_key=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new functions.https.HttpsError(
        "internal",
        "Failed to fetch data from Sportradar."
      );
    }
    const scheduleData = await response.json();

    // Transform the complex Sportradar data into the simple format our app needs
    const simplifiedGames = scheduleData.week.games.map((game) => {
      return {
        id: game.id,
        away: game.away.name,
        home: game.home.name,
        kickoff: game.scheduled,
        stadium: game.venue.name || "TBD",
        weather: "Forecast TBD", // Placeholder, as live weather is a separate API call
        startingQBs: {
          away: "TBD",
          home: "TBD",
        },
      };
    });

    return { games: simplifiedGames };
  } catch (error) {
    console.error("Error fetching or parsing Sportradar data:", error);
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while fetching the schedule."
    );
  }
});