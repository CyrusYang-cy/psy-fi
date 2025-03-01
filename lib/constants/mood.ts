// Define mood quadrants and their associated feelings
export const MOOD_QUADRANTS = {
  red: {
    name: "Red",
    description: "High energy, low pleasantness",
    feelings: [
      { name: "angry", definition: "Feeling or showing strong annoyance, displeasure, or hostility" },
      { name: "annoyed", definition: "bothered by something displeasing or uncomfortable" },
      { name: "anxious", definition: "Feeling or showing worry, nervousness, or unease about something" },
      { name: "apprehensive", definition: "Anxious or fearful about the future" },
      { name: "concerned", definition: "wondering if someone or something is ok" },
      { name: "confused", definition: "feling unable to make sense of something" },
      { name: "contempt", definition: "The feeling that a person or thing is beneath consideration or worthless" },
      { name: "embarrassed", definition: "Feeling awkward, self-conscious, or ashamed" },
      { name: "enraged", definition: "Feeling intense anger or fury" },
      { name: "envious", definition: "Feeling discontented or resentful of someone else's possessions or qualities" },
      { name: "fomo", definition: "fear of missing out" },
      { name: "frustrated", definition: "Feeling or expressing distress and annoyance" },
      { name: "frightened", definition: "Afraid or anxious because of something" },
      { name: "furious", definition: "Extremely angry and aggressive" },
      { name: "hyper", definition: "feeling energetic and like you want to move around" },
      { name: "impassioned", definition: "filled with lots of emotion" },
      { name: "irate", definition: "Feeling or showing extreme anger" },
      { name: "irritated", definition: "slightly angry with or annoyed by an action or event" },
      { name: "jealous", definition: "Feeling resentment towards someone because of their success or advantages" },
      { name: "jittery", definition: "Nervous or unable to relax" },
      { name: "livid", definition: "Extremely angry or furious" },
      { name: "nervous", definition: "Easily agitated or alarmed; tending to be anxious" },
      { name: "overwhelmed", definition: "Feeling buried or overcome by too many things" },
      { name: "panicked", definition: "Feeling sudden uncontrollable fear or anxiety" },
      { name: "peeved", definition: "slightly irritated about something" },
      { name: "pressured", definition: "feeling as if an important outcome depends on you" },
      { name: "repulsed", definition: "Feeling strong dislike or disgust" },
      { name: "restless", definition: "unable to relax due to anxeity or boredom" },
      { name: "scared", definition: "Afraid or frightened" },
      { name: "shocked", definition: "Surprised or upset by something unexpected" },
      { name: "stressed", definition: "Experiencing mental or emotional strain or tension" },
      { name: "tense", definition: "unable to relax" },
      { name: "terrified", definition: "Extremely frightened or afraid" },
      { name: "troubled", definition: "Experiencing distress, anxiety, or difficulty" },
      { name: "uneasy", definition: "vague sense that something is wrong" },
      { name: "worried", definition: "Anxious or troubled about actual or potential problems" },
    ]
  },
  blue: {
    name: "Blue",
    description: "Low energy, low pleasantness",
    feelings: [
      { name: "sad", definition: "Feeling or showing sorrow; unhappy" },
      { name: "disappointed", definition: "Sad or displeased because someone or something has failed to fulfill one's hopes or expectations" },
      { name: "lonely", definition: "Sad because one has no friends or company" },
      { name: "tired", definition: "In need of sleep or rest; weary" },
      { name: "bored", definition: "Feeling weary because one is unoccupied or lacks interest in one's current activity" }
    ]
  },
  green: {
    name: "Green",
    description: "Low energy, high pleasantness",
    feelings: [
      { name: "calm", definition: "Not showing or feeling nervousness, anger, or other strong emotions" },
      { name: "tranquil", definition: "Free from disturbance; peaceful" },
      { name: "relaxed", definition: "Free from tension and anxiety; at ease" },
      { name: "content", definition: "In a state of peaceful happiness" },
      { name: "secure", definition: "Feeling safe, stable, and free from fear or anxiety" }
    ]
  },
  yellow: {
    name: "Yellow",
    description: "High energy, high pleasantness",
    feelings: [
      { name: "happy", definition: "Feeling or showing pleasure or contentment" },
      { name: "excited", definition: "Very enthusiastic and eager" },
      { name: "curious", definition: "Eager to know or learn something" },
      { name: "proud", definition: "Feeling deep pleasure or satisfaction as a result of one's own achievements" },
      { name: "hopeful", definition: "Feeling or inspiring optimism about a future event" }
    ]
  }
}; 