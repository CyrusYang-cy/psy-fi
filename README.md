## 📋 <a name="table">Table of Contents</a>

1. 🤖 [Introduction](#introduction)
2. 🔋 [Features](#features)
3. 🤸 [Quick Start](#quick-start)

## <a name="introduction">🤖 Introduction</a>

Built with Next.js, **Psy-Fi** is an app that uses self-reported emotion to predict and manage purchasing behavior. By combining *mood diary* and customer’s *purchasing history*, Psy-Fi enables users to gain behavioral awareness and receive tailored financial suggestions from personal AI assistants. The app’s goal is to prevent emotional spending while promoting mindful financial decisions.  

## <a name="features">🔋 Features</a>

👉 **Mood Diary**: Users rate their mood on a [mood meter](https://hopelab.org/case-study/mood-meter/) (developed by Yale's *HOPE* Lab) to accurately identify, regulate, and take responsibility to their mood. 

👉 **Valence-Arousal Plot**: To quantify those mood, we further decompose those mood into valence and arousal dimensions based on work of Dr. Mohammad, Saif. (2018) [Paper](https://aclanthology.org/P18-1017/) | [Dataset](https://saifmohammad.com/WebPages/nrc-vad.html)

👉 **Mood-Spend Analysis**: We read the purchasing history from users’ credit cards directly and then correlate the spending patterns with mood (valence & Arousal) fluctuations

👉 **AI Assistant: Penny**: Whenver user logs new emotions, Penny analyze it and identify the emotion trends to flag potential risky purchasing moments and give proactive alert/suggestion. 

👉 **Social Comparison**: Penny will also compare your emotion spending against anonymized data from similar demographics and give more informed suggestions. 

## <a name="quick-start">🤸 Quick Start</a>

Follow these steps to set up the project locally on your machine.

**Prerequisites**

Make sure you have the following installed on your machine:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en)
- [npm](https://www.npmjs.com/) (Node Package Manager)

**Cloning the Repository**

```bash
git clone https://github.com/CyrusYang-cy/psy-fi
cd psy-fi
```

**Installation**

Install the project dependencies using npm and conda:

```bash
npm install

# On a different terminal
conda env create -f environment.yaml -n psy-fi
```

**Set Up Environment Variables**

Create a new file named `.env` in the root of your project and add the following content:

```env
#NEXT
NEXT_PUBLIC_SITE_URL=

#APPWRITE
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=
APPWRITE_DATABASE_ID=
APPWRITE_USER_COLLECTION_ID=
APPWRITE_BANK_COLLECTION_ID=
APPWRITE_TRANSACTION_COLLECTION_ID=
APPWRITE_SECRET=

#PLAID
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=
PLAID_PRODUCTS=
PLAID_COUNTRY_CODES=

#DWOLLA
DWOLLA_KEY=
DWOLLA_SECRET=
DWOLLA_BASE_URL=https://api-sandbox.dwolla.com
DWOLLA_ENV=sandbox

#DeepSeek API
Authorizatio_KEY= 
```

Replace the placeholder values with your actual respective account credentials. You can obtain these credentials by signing up on the [Appwrite](https://appwrite.io/?utm_source=youtube&utm_content=reactnative&ref=JSmastery), [Plaid](https://plaid.com/),  [Dwolla](https://www.dwolla.com/), and [DeepSeek](https://api-docs.deepseek.com/)

**Running the Project**

```bash
npm run dev

# on a different window
cd backend
python emotion_agent.py
```

- Open [http://localhost:3000](http://localhost:3000) in your browser to view the project.
- Open [http://127.0.0.1:8000/docs#/](http://127.0.0.1:8000/docs#/) in the browser to check if the backend is functioning correctly. 
