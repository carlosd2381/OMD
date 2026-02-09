export const CONTRACT_HEADER_HTML = `
<div style="text-align: center; margin-bottom: 40px;">
  <div style="width: 120px; height: 120px; background: #f3f4f6; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #9ca3af;">LOGO</div>
  <h1 style="font-family: serif; font-size: 24px; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 9px;">Dessert Catering Service</h1>
  <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em;">Contract Agreement</p>
</div>

<div style="display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 14px;">
  <div style="width: 40%;">
    <p style="font-size: 10px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 12px;">Contract Between:</p>
    <p style="font-weight: bold; margin-bottom: 4px;">{{client_first_name}} {{client_last_name}}</p>
    <p style="margin-bottom: 4px;">{{client_address}}</p>
    <p style="font-style: italic; color: #6b7280; margin-top: 8px;">Hereby known as 'CLIENT'.</p>
  </div>
  
  <div style="width: 20%; display: flex; align-items: center; justify-content: center;">
    <span style="font-weight: bold; color: #d1d5db; font-size: 12px;">AND</span>
  </div>
  
  <div style="width: 40%; text-align: right;">
    <p style="font-size: 10px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 12px;">Service Provider:</p>
    <p style="font-weight: bold; margin-bottom: 4px;">Oh My Desserts MX</p>
    <p style="margin-bottom: 4px;">Priv. Palmilla, Jardines del Sur II</p>
    <p style="margin-bottom: 4px;">Cancun, Mexico</p>
    <p style="font-style: italic; color: #6b7280; margin-top: 8px;">Hereby known as 'OMD'.</p>
  </div>
</div>

<div style="margin-bottom: 40px;">
  <p style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Event Information</p>
  
  <div style="background-color: #f9fafb; padding: 24px; border-radius: 8px; display: flex;">
    <div style="width: 50%; padding-right: 12px;">
      <div style="margin-bottom: 24px;">
        <p style="font-size: 10px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Venue</p>
        <p style="font-weight: bold; margin-bottom: 2px;">{{venue_name}}</p>
        <p style="font-size: 12px; color: #4b5563;">{{venue_sub_location}}</p>
      </div>
      <div>
        <p style="font-size: 10px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Address</p>
        <p style="font-size: 12px; color: #4b5563;">{{venue_address}}</p>
      </div>
    </div>
    
    <div style="width: 50%; padding-left: 12px;">
      <div style="margin-bottom: 24px;">
        <p style="font-size: 10px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Date</p>
        <p style="font-weight: bold;">{{event_date}}</p>
      </div>
      <div>
        <p style="font-size: 10px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Time</p>
        <p style="font-weight: bold;">{{event_start_time}} - {{event_end_time}}</p>
      </div>
    </div>
  </div>
</div>
`;
