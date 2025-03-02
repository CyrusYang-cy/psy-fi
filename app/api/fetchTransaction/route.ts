import { NextRequest, NextResponse } from 'next/server';

// Helper function to validate date format (YYYY-MM-DD)
function isValidDateFormat(dateString: string): boolean {
  if (!dateString) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  // Check if it's a valid date
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    
    // Extract parameters from the request body
    const { institution_id = 'ins_1', start_date, end_date } = body;
    
    // Prepare the request payload
    const payload: any = {
      institution_id
    };
    
    // Add optional parameters if they exist and validate date formats
    if (start_date) {
      if (!isValidDateFormat(start_date)) {
        return NextResponse.json(
          { error: 'Invalid start_date format. Please use YYYY-MM-DD format.' },
          { status: 400 }
        );
      }
      payload.start_date = start_date;
    }
    
    if (end_date) {
      if (!isValidDateFormat(end_date)) {
        return NextResponse.json(
          { error: 'Invalid end_date format. Please use YYYY-MM-DD format.' },
          { status: 400 }
        );
      }
      payload.end_date = end_date;
    }
    
    // Call the backend API
    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/fetchTransaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in fetchTransaction API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction data', details: (error as Error).message },
      { status: 500 }
    );
  }
} 