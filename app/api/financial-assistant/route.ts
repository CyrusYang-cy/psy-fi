import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    let emotion = 'neutral';
    let purchaseHistory = '';

    // Try to get data from request body first
    try {
      const body = await request.json();
      emotion = body.emotion || emotion;
      purchaseHistory = body.purchase_history || purchaseHistory;
    } catch (e) {
      // If parsing JSON fails, try query parameters
      const searchParams = request.nextUrl.searchParams;
      emotion = searchParams.get('emotion') || emotion;
      purchaseHistory = searchParams.get('purchase_history') || purchaseHistory;
    }

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
      { error: 'Failed to get response from financial assistant', details: (error as Error).message },
      { status: 500 }
    );
  }
} 