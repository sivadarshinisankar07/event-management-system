import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Intelligent Event Assistant Controller
 * Provides natural language campus event discovery, FAQ guidance, and optional Gemini integration.
 * Zero external paid API dependency required: built-in intelligent engine works out of the box with real MySQL events.
 */

function formatEventSummary(ev) {
  const d = new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const price = ev.payment_mode === 'Free' ? 'Free' : `₹${ev.price}`;
  return `• **${ev.name}** (${ev.category})\n  📅 ${d} | ⏰ ${ev.start_time.slice(0, 5)} - ${ev.end_time.slice(0, 5)}\n  📍 ${ev.venue} | 💵 ${price} | Dept: ${ev.department}\n  [View Details](/events/${ev.id || ev.event_id})`;
}

export async function chatAssistant(req, res) {
  try {
    const { message = '', conversationHistory = [] } = req.body;
    const cleanMsg = String(message).trim().toLowerCase();

    if (!cleanMsg) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty.',
      });
    }

    // 1. Fetch live published events from database
    const [events] = await pool.query(
      `SELECT id, event_id, name, type, category, department, description,
              date, start_time, end_time, venue, capacity, registered_count,
              payment_mode, price, status
       FROM events
       WHERE status IN ('Published', 'Full')
       ORDER BY date ASC`
    );

    // 2. Check for Gemini API Key if configured
    try {
      dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
    } catch {
      // ignore
    }
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here' && geminiApiKey.trim() !== '') {
      try {
        const eventsContext = events.map((e) => ({
          name: e.name,
          category: e.category,
          department: e.department,
          date: new Date(e.date).toISOString().split('T')[0],
          time: `${e.start_time} - ${e.end_time}`,
          venue: e.venue,
          price: e.payment_mode === 'Free' ? 'Free' : `₹${e.price}`,
          seatsLeft: e.capacity - e.registered_count,
          url: `/events/${e.id || e.event_id}`,
        }));

        const systemPrompt = `You are the CampusEvents AI Assistant for our college event management platform.
Current live campus events in database:
${JSON.stringify(eventsContext, null, 2)}

Provide helpful, friendly, and concise responses to students. When mentioning events, include their date, venue, price, and markdown link like [View Details](/events/ID).
If students ask about registration, tickets, payments, or refunds, explain the CampusEvents workflow clearly.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }],
                },
              ],
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return res.json({
              success: true,
              engine: 'Gemini-AI',
              reply,
              suggestedActions: [
                { label: 'Browse All Events', path: '/events' },
                { label: 'My Registrations', path: '/participant/registrations' },
              ],
            });
          }
        }
      } catch (geminiErr) {
        console.warn('[ASSISTANT_GEMINI_FALLBACK]', geminiErr.message);
      }
    }

    // 3. Built-in High-Accuracy Natural Language Engine (Zero Paid Dependency)
    let reply = '';
    const suggestedActions = [];
    const matchedEvents = [];

    // Case A: Free events query
    if (cleanMsg.includes('free') || cleanMsg.includes('no cost') || cleanMsg.includes('zero')) {
      const freeEvents = events.filter((e) => e.payment_mode === 'Free');
      if (freeEvents.length > 0) {
        reply = `Here are the upcoming **Free** events available on campus:\n\n` +
          freeEvents.map(formatEventSummary).join('\n\n') +
          `\n\nYou can register for these directly without any payment requirement!`;
        suggestedActions.push({ label: 'View Events', path: '/events' });
      } else {
        reply = 'There are currently no free events scheduled. All scheduled events have an entry fee.';
      }
    }
    // Case B: Category & Topic queries
    else if (
      cleanMsg.includes('tech') || cleanMsg.includes('hackathon') || cleanMsg.includes('coding') ||
      cleanMsg.includes('cultural') || cleanMsg.includes('sports') || cleanMsg.includes('workshop') ||
      cleanMsg.includes('seminar') || cleanMsg.includes('music') || cleanMsg.includes('dance') ||
      cleanMsg.includes('ai') || cleanMsg.includes('club')
    ) {
      const distinctCategories = Array.from(new Set(events.map((e) => e.category).filter(Boolean)));
      const matchedCat = distinctCategories.find((c) => cleanMsg.includes(c.toLowerCase())) ||
        (cleanMsg.includes('hackathon') ? 'Hackathon' : null) ||
        (cleanMsg.includes('workshop') ? 'Workshop' : null) ||
        (cleanMsg.includes('club') ? 'Club Event' : null) ||
        (cleanMsg.includes('tech') || cleanMsg.includes('coding') || cleanMsg.includes('ai') ? 'Technical' : 'General');

      const catEvents = events.filter((e) => {
        const cat = (e.category || '').toLowerCase();
        const nm = (e.name || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        if (matchedCat && matchedCat !== 'General' && cat.includes(matchedCat.toLowerCase())) return true;
        if (cleanMsg.includes('hackathon') && (cat.includes('hackathon') || nm.includes('hackathon'))) return true;
        if (cleanMsg.includes('workshop') && (cat.includes('workshop') || nm.includes('workshop'))) return true;
        if (cleanMsg.includes('ai') && (nm.includes('ai') || desc.includes('ai') || cat.includes('ai'))) return true;
        if ((cleanMsg.includes('tech') || cleanMsg.includes('coding')) && (cat.includes('tech') || cat.includes('hackathon') || nm.includes('hackathon') || nm.includes('ai'))) return true;
        return false;
      });

      if (catEvents.length > 0) {
        reply = `Found **${catEvents.length}** event(s) matching your request:\n\n` +
          catEvents.map(formatEventSummary).join('\n\n');
        suggestedActions.push({ label: 'Browse All Events', path: '/events' });
      } else {
        reply = `No upcoming events found specifically for **${matchedCat}**. Check out all upcoming events below:`;
        reply += '\n\n' + events.slice(0, 3).map(formatEventSummary).join('\n\n');
      }
    }
    // Case C: Department query
    else if (
      cleanMsg.includes('department') || cleanMsg.includes('cs') || cleanMsg.includes('it') ||
      cleanMsg.includes('mech') || cleanMsg.includes('civil') || cleanMsg.includes('ece')
    ) {
      const deptEvents = events.filter((e) => {
        const d = (e.department || '').toLowerCase();
        return cleanMsg.includes(d) || (cleanMsg.includes('it') && d.includes('it')) || (cleanMsg.includes('cs') && d.includes('computer'));
      });

      if (deptEvents.length > 0) {
        reply = `Here are events organized by/for that department:\n\n` +
          deptEvents.map(formatEventSummary).join('\n\n');
      } else {
        reply = `Here are all upcoming events across departments:\n\n` +
          events.slice(0, 3).map(formatEventSummary).join('\n\n');
      }
      suggestedActions.push({ label: 'Browse Events', path: '/events' });
    }
    // Case D: How to register or participate
    else if (cleanMsg.includes('register') || cleanMsg.includes('how to join') || cleanMsg.includes('sign up')) {
      reply = `**How to Register for an Event:**\n\n` +
        `1. Go to the [Events](/events) page and click on any event.\n` +
        `2. Click **Register Now**.\n` +
        `3. For Free events, your registration is confirmed immediately with a digital ticket!\n` +
        `4. For paid events, select Online (Card Simulation) or Offline (Cash at Helpdesk).\n` +
        `5. Your confirmed ticket with QR code will be ready in [My Tickets](/participant/tickets).`;
      suggestedActions.push({ label: 'Explore Events', path: '/events' }, { label: 'My Tickets', path: '/participant/tickets' });
    }
    // Case E: Tickets, QR code & Check-in
    else if (cleanMsg.includes('ticket') || cleanMsg.includes('qr') || cleanMsg.includes('check-in') || cleanMsg.includes('check in')) {
      reply = `**Ticket & Entry Information:**\n\n` +
        `• Each confirmed registration automatically generates a unique digital ticket.\n` +
        `• Your ticket includes a secure QR pass with your Ticket ID.\n` +
        `• At the venue, event organizers scan your QR code or verify your Ticket ID at [Check-in](/admin/checkin).\n` +
        `• You can download or view all your passes in [My Tickets](/participant/tickets).`;
      suggestedActions.push({ label: 'My Tickets', path: '/participant/tickets' });
    }
    // Case F: Refunds and cancellations
    else if (cleanMsg.includes('refund') || cleanMsg.includes('cancel')) {
      reply = `**Cancellation & Refund Policy:**\n\n` +
        `• You can request a refund for paid events from [My Registrations](/participant/registrations).\n` +
        `• Provide your reason for cancellation; administrators review requests within 24–48 hours.\n` +
        `• Once approved, the status is marked as 'Approved' and registration is cancelled.`;
      suggestedActions.push({ label: 'My Registrations', path: '/participant/registrations' });
    }
    // Case G: Upcoming events overview
    else if (cleanMsg.includes('upcoming') || cleanMsg.includes('all events') || cleanMsg.includes('what is happening') || cleanMsg.includes('schedule')) {
      reply = `Here are the next upcoming events on campus:\n\n` +
        events.slice(0, 4).map(formatEventSummary).join('\n\n') +
        `\n\nClick any event link above for complete details, rules, and registration!`;
      suggestedActions.push({ label: 'View All Events', path: '/events' });
    }
    // Case H: General greeting or fallback
    else {
      reply = `Hello! I am your **CampusEvents Assistant** 🎓.\n\n` +
        `I can help you with:\n` +
        `• 🔍 **Discovering Events**: Ask for "technical workshops", "free events", or "events in my department".\n` +
        `• 📝 **Registration Guide**: Ask "how do I register?" or "how do payments work?".\n` +
        `• 🎟️ **Tickets & QR Passes**: Ask "where is my ticket?" or "how does check-in work?".\n` +
        `• ↩️ **Refunds**: Ask about cancellation and refund policies.\n\n` +
        `Currently, there are **${events.length} active events** scheduled on campus! What would you like to explore?`;
      suggestedActions.push({ label: 'Browse Events', path: '/events' }, { label: 'My Dashboard', path: '/participant/dashboard' });
    }

    return res.status(200).json({
      success: true,
      engine: 'BuiltIn-CampusEvents-NLP',
      reply,
      suggestedActions,
      eventCount: events.length,
    });
  } catch (err) {
    console.error('[ASSISTANT_ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process assistant response.',
    });
  }
}
