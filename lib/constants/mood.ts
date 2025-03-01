// Define mood quadrants and their associated feelings
export const MOOD_QUADRANTS = {
  red: {
    name: "Red",
    description: "High energy, low pleasantness",
    feelings: [
      { name: "angry", definition: "Feeling or showing strong annoyance, displeasure, or hostility", valence: -0.756, arousal: 0.66 },
      { name: "annoyed", definition: "bothered by something displeasing or uncomfortable", valence: -0.792, arousal: 0.566 },
      { name: "anxious", definition: "Feeling or showing worry, nervousness, or unease about something", valence: -0.438, arousal: 0.75 },
      { name: "concerned", definition: "wondering if someone or something is ok", valence: -0.416, arousal: 0.396 },
      { name: "confused", definition: "feling unable to make sense of something", valence: -0.56, arousal: 0.3 },
      { name: "contempt", definition: "The feeling that a person or thing is beneath consideration or worthless", valence: -0.588, arousal: 0.27 },
      { name: "embarrassed", definition: "Feeling awkward, self-conscious, or ashamed", valence: -0.632, arousal: 0.12 },
      { name: "enraged", definition: "Feeling intense anger or fury", valence: -0.834, arousal: 0.924 },
      { name: "envious", definition: "Feeling discontented or resentful of someone else's possessions or qualities", valence: -0.78, arousal: 0.508 },
      { name: "frustrated", definition: "Feeling or expressing distress and annoyance", valence: -0.84, arousal: 0.302 },
      { name: "frightened", definition: "Afraid or anxious because of something", valence: -0.694, arousal: 0.634 },
      { name: "furious", definition: "Extremely angry and aggressive", valence: -0.876, arousal: 0.906 },
      { name: "irritated", definition: "slightly angry with or annoyed by an action or event", valence: -0.58, arousal: 0.632 },
      { name: "jealous", definition: "Feeling resentment towards someone because of their success or advantages", valence: -0.654, arousal: 0.71 },
      { name: "nervous", definition: "Easily agitated or alarmed; tending to be anxious", valence: -0.53, arousal: 0.64 },
      { name: "overwhelmed", definition: "Feeling buried or overcome by too many things", valence: -0.318, arousal: 0.36 },
      { name: "restless", definition: "unable to relax due to anxeity or boredom", valence: -0.562, arousal: 0.62 },
      { name: "scared", definition: "Afraid or frightened", valence: -0.708, arousal: 0.656 },
      { name: "shocked", definition: "Surprised or upset by something unexpected", valence: -0.416, arousal: 0.546 },
      { name: "stressed", definition: "Experiencing mental or emotional strain or tension", valence: -0.666, arousal: 0.48 },
      { name: "tense", definition: "unable to relax", valence: -0.208, arousal: -0.122 },
      { name: "terrified", definition: "Extremely frightened or afraid", valence: -0.82, arousal: 0.804 },
      { name: "troubled", definition: "Experiencing distress, anxiety, or difficulty", valence: -0.666, arousal: 0.254 },
      { name: "uneasy", definition: "vague sense that something is wrong", valence: -0.77, arousal: 0.196 },
      { name: "worried", definition: "Anxious or troubled about actual or potential problems", valence: -0.812, arousal: 0.648 },
    ]
  },
  blue: {
    name: "Blue",
    description: "Low energy, low pleasantness",
    feelings: [
      { name: "pessimistic", definition: "Having a negative outlook on life", valence: -0.824, arousal: -0.212 },
      { name: "depressed", definition: "Feeling extremely sad or hopeless", valence: -0.952, arousal: -0.11 },
      { name: "miserable", definition: "Feeling extremely unhappy or uncomfortable", valence: -0.876, arousal: -0.078 },
      { name: "vulnerable", definition: "Feeling susceptible to emotional hurt or attack", valence: -0.604, arousal: -0.02 },
      { name: "numb", definition: "Feeling emotionally unresponsive or insensitive", valence: -0.784, arousal: -0.16 },
      { name: "hopeless", definition: "Feeling that a situation is impossible to improve", valence: -0.812, arousal: -0.404 },
      { name: "disconnected", definition: "Feeling unconnected or detached from others", valence: -0.416, arousal: -0.448 },
      { name: "alienated", definition: "Feeling isolated or disconnected from society", valence: -0.18, arousal: -0.154 },
      { name: "glum", definition: "Feeling sullen or sulky", valence: -0.512, arousal: -0.326 },
      { name: "disheartened", definition: "Feeling discouraged or demoralized", valence: -0.694, arousal: -0.314 },
      { name: "disappointed", definition: "Sad or displeased because someone or something has failed to fulfill one's hopes or expectations", valence: -0.858, arousal: -0.056 },
      { name: "spent", definition: "Feeling exhausted or drained", valence: -0.408, arousal: -0.408 },
      { name: "nostalgic", definition: "Feeling sentimental or wistful for the past", valence: -0.084, arousal: -0.298 },
      { name: "down", definition: "Feeling sad or depressed", valence: -0.584, arousal: -0.34 },
      { name: "meh", definition: "Feeling indifferent or unenthusiastic", valence: -0.24, arousal: -0.428 },
      { name: "sad", definition: "Feeling or showing sorrow; unhappy", valence: -0.55, arousal: -0.334 },
      { name: "discouraged", definition: "Feeling disheartened or demoralized", valence: -0.56, arousal: -0.392 },
      { name: "lonely", definition: "Sad because one has no friends or company", valence: -0.5, arousal: -0.548 },
      { name: "exhausted", definition: "Feeling extremely tired or drained", valence: -0.754, arousal: -0.154 },
      { name: "bored", definition: "Feeling weary because one is unoccupied or lacks interest in one's current activity", valence: -0.694, arousal: -0.666 },
      { name: "tired", definition: "In need of sleep or rest; weary", valence: -0.75, arousal: -0.366 },
      { name: "fatigued", definition: "Feeling extremely tired or exhausted", valence: -0.708, arousal: -0.134 },
      { name: "apathetic", definition: "Feeling indifferent or lacking enthusiasm", valence: -0.624, arousal: -0.416 },
      { name: "helpless", definition: "Feeling powerless or unable to act", valence: -0.792, arousal: -0.16 },
      { name: "insecure", definition: "Feeling uncertain or doubtful about one's abilities or judgment", valence: -0.772, arousal: -0.076 }
    ]
  },
  green: {
    name: "Green",
    description: "Low energy, high pleasantness",
    feelings: [
      { name: "relaxed", definition: "Free from tension and anxiety; at ease", valence: 0.73, arousal: -0.82 },
      { name: "serene", definition: "Peaceful and untroubled", valence: 0.604, arousal: -0.736 },
      { name: "calm", definition: "Not showing or feeling nervousness, anger, or other strong emotions", valence: 0.75, arousal: -0.8 },
      { name: "peaceful", definition: "Free from disturbance or turmoil", valence: 0.734, arousal: -0.784 },
      { name: "safe", definition: "Protected from harm or danger", valence: 0.796, arousal: -0.388 },
      { name: "relieved", definition: "Feeling a sense of comfort or reassurance", valence: 0.792, arousal: -0.372 },
      { name: "fulfilled", definition: "Satisfied or content", valence: 0.792, arousal: -0.04 },
      { name: "good", definition: "Having a positive or favorable quality", valence: 0.876, arousal: -0.264 },
      { name: "comfortable", definition: "Giving a feeling of physical or mental ease", valence: 0.854, arousal: -0.674 },
      { name: "loved", definition: "Deeply cared for or cherished", valence: 0.854, arousal: -0.096 },
      { name: "tranquil", definition: "Free from disturbance; peaceful", valence: 0.834, arousal: -0.812 },
      { name: "grateful", definition: "Feeling or showing appreciation or thanks", valence: 0.916, arousal: -0.294 },
      { name: "blessed", definition: "Favored or protected by God or a higher power", valence: 0.82, arousal: -0.442 },
      { name: "appreciated", definition: "Recognized or valued", valence: 0.82, arousal: -0.132 },
      { name: "supported", definition: "Given assistance or encouragement", valence: 0.706, arousal: -0.184 },
      { name: "included", definition: "Made to feel part of a group or community", valence: 0.52, arousal: -0.196 },
      { name: "content", definition: "In a state of peaceful happiness", valence: 0.528, arousal: -0.408 },
      { name: "thoughtful", definition: "Showing careful thought and consideration", valence: 0.334, arousal: -0.42 },
      { name: "confident", definition: "Feeling or showing confidence in one's abilities", valence: 0.53, arousal: -0.352 },
      { name: "hopeful", definition: "Feeling or inspiring optimism about a future event", valence: 0.894, arousal: -0.286 },
      { name: "sympathetic", definition: "Feeling or showing compassion or understanding", valence: 0.592, arousal: -0.132 },
      { name: "compassionate", definition: "Feeling or showing sympathy and concern for others", valence: 0.714, arousal: -0.192 },
      { name: "balanced", definition: "Having a stable and healthy mental state", valence: 0.612, arousal: -0.49 },
      { name: "thankful", definition: "Feeling or expressing gratitude", valence: 0.938, arousal: -0.312 },
      { name: "respected", definition: "Feeling or deserving of respect", valence: 0.816, arousal: -0.118 }
    ]
  },
  yellow: {
    name: "Yellow",
    description: "High energy, high pleasantness",
    feelings: [
      { name: "surprised", definition: "Feeling astonished or caught off guard", valence: 0.568, arousal: 0.71 },
      { name: "excited", definition: "Very enthusiastic and eager", valence: 0.816, arousal: 0.862 },
      { name: "cheerful", definition: "Having a pleasant and optimistic disposition", valence: 0.98, arousal: 0.44 },
      { name: "pleased", definition: "Feeling satisfied or content", valence: 0.878, arousal: 0.096 },
      { name: "determined", definition: "Having a firm intention or decision", valence: 0.52, arousal: 0.056 },
      { name: "eager", definition: "Feeling enthusiastic and impatient to do something", valence: 0.042, arousal: 0.624 },
      { name: "curious", definition: "Eager to know or learn something", valence: 0.27, arousal: 0.2 },
      { name: "playful", definition: "Having a lighthearted and humorous nature", valence: 0.784, arousal: 0.376 },
      { name: "exhilarated", definition: "Feeling extremely happy or excited", valence: 0.78, arousal: 0.926 },
      { name: "successful", definition: "Achieving a desired goal or outcome", valence: 0.898, arousal: 0.448 },
      { name: "enthusiastic", definition: "Feeling intense excitement and interest", valence: 0.77, arousal: 0.736 },
      { name: "upbeat", definition: "Having a cheerful and optimistic outlook", valence: 0.756, arousal: 0.062 },
      { name: "alive", definition: "Feeling full of energy and vitality", valence: 0.632, arousal: 0.274 },
      { name: "delighted", definition: "Feeling great pleasure or enjoyment", valence: 0.876, arousal: 0.328 },
      { name: "thrilled", definition: "Feeling extremely excited or pleased", valence: 0.796, arousal: 0.636 },
      { name: "amazed", definition: "Feeling great surprise or wonder", valence: 0.592, arousal: 0.558 },
      { name: "joyful", definition: "Feeling great happiness or pleasure", valence: 0.98, arousal: 0.48 },
      { name: "happy", definition: "Feeling or showing pleasure or contentment", valence: 1.0, arousal: 0.47 },
      { name: "wishful", definition: "Feeling a strong desire or longing", valence: 0.77, arousal: 0.424 },
      { name: "inspired", definition: "Feeling motivated or influenced to do something", valence: 0.934, arousal: 0.404 },
      { name: "productive", definition: "Achieving a lot in a short time", valence: 0.694, arousal: 0.354 },
      { name: "engaged", definition: "Actively participating or involved", valence: 0.674, arousal: 0.192 },
      { name: "ecstatic", definition: "Feeling overwhelming happiness or excitement", valence: 0.75, arousal: 0.538 },
      { name: "optimistic", definition: "Having a positive outlook on life", valence: 0.958, arousal: 0.16 },
      { name: "accomplished", definition: "Feeling proud of one's achievements", valence: 0.74, arousal: 0.04 }
    ]
  }
}; 