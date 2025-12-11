-- Insert Default Contract Template
INSERT INTO templates (name, type, subject, content, is_active)
VALUES (
  'Standard Service Contract',
  'contract',
  'Service Contract - {{event_name}}',
  '<div style="font-family: Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto;">
    
    <!-- PAGE 1 -->
    <div style="text-align: center; margin-bottom: 60px;">
        <div style="width: 120px; height: 120px; background-color: #f5f0eb; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="color: #999; font-size: 12px;">LOGO</span>
        </div>
        <h1 style="font-family: ''Times New Roman'', serif; text-transform: uppercase; letter-spacing: 2px; font-size: 24px; margin-bottom: 10px;">Dessert Catering Service</h1>
        <h2 style="font-size: 14px; font-weight: normal; text-transform: uppercase; color: #666;">Contract Agreement</h2>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 60px;">
        <div style="width: 45%;">
            <p style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #999; margin-bottom: 10px;">Contract Between:</p>
            <p style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">{{client_first_name}} {{client_last_name}}</p>
            <p style="margin: 0;">{{client_address}}</p>
            <p style="margin: 0;">{{client_city_state_zip}}</p>
            <p style="margin-top: 10px; font-style: italic; color: #666;">Hereby known as ''CLIENT''.</p>
        </div>
        
        <div style="width: 10%; text-align: center; padding-top: 20px;">
            <span style="font-weight: bold; color: #ccc;">AND</span>
        </div>

        <div style="width: 45%; text-align: right;">
            <p style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #999; margin-bottom: 10px;">Service Provider:</p>
            <p style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">Oh My Desserts MX</p>
            <p style="margin: 0;">Gran Santa Fe III</p>
            <p style="margin: 0;">Cancun, Mexico</p>
            <p style="margin-top: 10px; font-style: italic; color: #666;">Hereby known as ''OMD''.</p>
        </div>
    </div>

    <div style="page-break-after: always;"></div>

    <!-- PAGE 2 -->
    <div style="margin-top: 40px; margin-bottom: 40px;">
        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">Event Information</h3>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <p style="font-size: 11px; text-transform: uppercase; color: #999; margin-bottom: 4px;">Date</p>
                    <p style="font-weight: bold;">{{event_date}}</p>
                </div>
                <div>
                    <p style="font-size: 11px; text-transform: uppercase; color: #999; margin-bottom: 4px;">Time</p>
                    <p style="font-weight: bold;">{{time_start}} - {{time_end}}</p>
                </div>
                <div>
                    <p style="font-size: 11px; text-transform: uppercase; color: #999; margin-bottom: 4px;">Venue</p>
                    <p style="font-weight: bold;">{{venue_name}}</p>
                    <p style="font-size: 12px;">{{venue_sub_location}}</p>
                </div>
                <div>
                    <p style="font-size: 11px; text-transform: uppercase; color: #999; margin-bottom: 4px;">Address</p>
                    <p style="font-size: 12px;">{{venue_address}}</p>
                </div>
            </div>
        </div>

        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">Service Details</h3>
        <div style="margin-bottom: 30px;">
            {{quote_line_items}}
        </div>

        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">Payment Schedule</h3>
        <div style="margin-bottom: 30px;">
            {{invoice_schedule}}
        </div>
    </div>

    <div style="page-break-after: always;"></div>

    <!-- PAGE 3 -->
    <div style="margin-top: 40px;">
        <h3 style="text-align: center; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 30px;">Terms and Conditions</h3>
        
        <ol style="padding-left: 20px; font-size: 12px; color: #444;">
            <li style="margin-bottom: 15px;">
                <strong>Parties.</strong><br>
                The client(s) listed above, or a third party acting as a purchaser of the indicated services, will hereinafter be collectively referred to as "CLIENT". Hereinafter, Oh My Desserts! MX will be referred to as "OMD". OMD is in the business of providing dessert catering service for events and CLIENT wishes to retain OMD services on the date and time set forth in this contract listed above.
            </li>
            <li style="margin-bottom: 15px;">
                <strong>Contracted Churro Catering Services.</strong><br>
                OMD undertakes to provide the services and food included in the selected package, and the CLIENT agrees to retain OMD and to purchase the indicated package of OMD.
            </li>
            <li style="margin-bottom: 15px;">
                <strong>Initial payment / retainer.</strong><br>
                The CLIENT agrees to pay a non-refundable 35% retainer / initial payment upon signing this contract. The retainer payment is non-refundable in all aspects.
            </li>
            <li style="margin-bottom: 15px;">
                <strong>Payment schedule.</strong><br>
                2 Payments: 35% retainer on booking and 65% Balance 10 days prior to the event. The retainer payment is non-refundable in all aspects. If event is within 10 days of this contract, full balance is due upon signing.
            </li>
            <li style="margin-bottom: 15px;">
                <strong>Change of date.</strong><br>
                If the CLIENT wishes to change the date of the event, OMD will apply the total balance of the CLIENT''s retainer and prepayments to another date, subject to the availability of OMD. All costs are subject to change. If OMD is not available on the new date and/or time, it will be treated as a cancellation, as explained below (Section #6.).
            </li>
            <li style="margin-bottom: 15px;">
                <strong>Cancellation.</strong><br>
                In case of cancellation of the event by the CLIENT, for any reason, the retainer/initial payment and all payments received to date will be retained by Oh My Desserts MX as liquidated damages, not as a penalty, and will not be refundable in all aspects.
            </li>
            <li style="margin-bottom: 15px;">
                <strong>Number of guests.</strong><br>
                Final guest count is due ten (10) days prior to the event date. Any additional guests are subject to additional charges (Minimum extra cost per person is $4.50 USD).
            </li>
            <li style="margin-bottom: 15px;">
                <strong>Leftovers.</strong><br>
                OMD reserves the right to discard, give away or take any leftover food, after the agreed time of the event.
            </li>
            <li style="margin-bottom: 15px;">
                <strong>Schedule Delays / Additional time.</strong><br>
                CLIENT will be billed for additional staff hours for any extension of time beyond the previously agreed upon time (Extra hours are billed at $1,000 MXN Pesos per hour, billed in increments of 15 minutes).
            </li>
            <li style="margin-bottom: 15px;">
                <strong>Cancellation by OMD.</strong><br>
                If OMD is unable to perform its obligations under this Agreement for reasons beyond its control, OMD may locate and retain a replacement Dessert Catering company at no additional cost to Customer, or refund Customer''s money in full. OMD will not be responsible for any additional damages or compensation under these circumstances.
            </li>
            <li style="margin-bottom: 15px;">
                <strong>Force majeure.</strong><br>
                OMD will not be liable to the CLIENT for any loss resulting from an act of force majeure, natural disaster (including, among others, fires, earthquakes, storms, hurricanes, floods, lightning, tornadoes), an accident of any kind, an act of the public enemy, war, general arrest or restraint of the government and the people, civil unrest or similar occurrence, terrorist attack.
            </li>
            <li style="margin-bottom: 15px;">
                <strong>Limitation of Liability.</strong><br>
                If OMD does not provide the services below due to reasons other than those listed in Paragraph 11 of this document, CLIENT''s recovery and OMD''s liability are limited to the total amount paid by CLIENT to OMD under this contract and OMD will have no further liability to CLIENT, regardless of the total amount of costs or damages claimed by CLIENT.
            </li>
            <li style="margin-bottom: 15px;">
                <strong>Modifications of the contract.</strong><br>
                This contract may only be amended or modified in writing signed by both parties, including any rescheduling or cancellation.
            </li>
            <li style="margin-bottom: 15px;">
                <strong>Applicable Law, Jurisdiction and Venue.</strong><br>
                This contract will be governed by the laws of the State of Quintana Roo, without giving effect to the principles of conflict of laws. The consent of the parties to the jurisdiction and competence of the state and federal courts located in the State of Quintana Roo.
            </li>
            <li style="margin-bottom: 15px;">
                <strong>Counter-parties; Electronic signatures.</strong><br>
                This contract may be signed by any number of counter-parties, each of which will be considered original, and all the signatures together will constitute the same contract. This Agreement may be signed by fax, email, or other electronic means, any of which shall be fully binding as an original signature.
            </li>
        </ol>
    </div>
</div>',
  true
);
