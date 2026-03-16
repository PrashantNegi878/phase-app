/**
 * Vercel Serverless API Route for AI-powered Cycle Suggestions
 * Path: /api/suggestion
 *
 * This endpoint securely calls Google Gemini API to generate personalized
 * suggestions based on the current cycle phase and partner preferences.
 *
 * Environment Variables Required:
 * - GEMINI_API_KEY: Your Google Gemini API key (keep secure in Vercel env vars)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../src/services/firebase'; // Import Firestore instance
import { doc, getDoc } from 'firebase/firestore';
import { getToday } from '../src/utils/dateUtils';

interface RequestBody {
  cyclePhase: string;
  userId: string;
}

// Initialize Gemini with API key from environment
const genAI = new GoogleGenerativeAI(import.meta.env.GEMINI_API_KEY || '');

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cyclePhase, userId } = req.body as RequestBody;

    // Validate input
    if (!cyclePhase || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: cyclePhase, userId',
      });
    }

    // Fetch partner profile from Firestore
    const partnerProfileRef = doc(db, 'partnerProfiles', userId);
    const partnerSnapshot = await getDoc(partnerProfileRef);

    if (!partnerSnapshot.exists()) {
      return res.status(404).json({ error: 'Partner profile not found' });
    }

    const partnerProfile = partnerSnapshot.data();
    const supportStyle = partnerProfile?.supportStyle || 'emotional-support';
    const scheduleConstraints =
      partnerProfile?.dailyScheduleConstraints || 'flexible';

    // Create a detailed prompt for Gemini
    const prompt = `You are a supportive wellness advisor for partners of menstruating individuals. 
Generate 2 short, practical, and empathetic suggestions for a partner whose significant other is in the ${cyclePhase} phase of their cycle.

Consider:
- Support Style: ${supportStyle}
- Daily Schedule: ${scheduleConstraints}

Each suggestion should be 1-2 sentences, actionable, and compassionate.
Format your response as a JSON array with exactly 2 suggestions, like this:
["suggestion 1", "suggestion 2"]

Do not include any other text, only the JSON array.`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    const responseText =
      result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the response
    let suggestions: string[] = [];
    try {
      // Extract JSON array from the response
      const jsonMatch = responseText.match(/\[.*\]/s);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      // Fallback suggestions if parsing fails
      suggestions = [
        'Check in with how they are feeling today with genuine care.',
        'Consider preparing their favorite meal or offering a shoulder/hand massage.',
      ];
    }

    // Return suggestions
    return res.status(200).json({
      suggestions,
      cyclePhase,
      generatedAt: getToday().toISOString(),
    });
  } catch (error) {
    console.error('API Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';

    return res.status(500).json({
      error: 'Failed to generate suggestions',
      details: import.meta.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
}
