import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get emotion and purchase history from query parameters
    const searchParams = request.nextUrl.searchParams;
    const emotion = searchParams.get('emotion') || 'neutral';
    const purchaseHistory = searchParams.get('purchase_history') || '';

    // Call the backend API
    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/financial-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emotion,
        purchase_history: purchaseHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in financial-assistant API route:', error);
    return NextResponse.json(
      { error: 'Failed to get response from financial assistant' },
      { status: 500 }
    );
  }
} 