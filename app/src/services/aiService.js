// services/aiService.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your actual server IP
const SERVER_URL = 'https://the-deft-crew-production.up.railway.app'; // Update this

class AIService {
  constructor() {
    this.conversationHistory = [];
    this.maxHistoryLength = 20;
    this.isBackendAvailable = true;
  }

  async loadConversationHistory() {
    try {
      const history = await AsyncStorage.getItem('chat_history');
      if (history) {
        this.conversationHistory = JSON.parse(history);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }

  async saveConversationHistory() {
    try {
      await AsyncStorage.setItem('chat_history', JSON.stringify(this.conversationHistory));
    } catch (error) {
      console.error('Error saving history:', error);
    }
  }

  clearHistory() {
    this.conversationHistory = [];
    this.saveConversationHistory();
  }

  addToHistory(role, content) {
    this.conversationHistory.push({ role, content });
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }
    this.saveConversationHistory();
  }

  async sendMessageToBackend(userMessage) {
    try {
      const historyForBackend = this.conversationHistory.slice(-10);
      
      const response = await axios.post(
        `${SERVER_URL}/api/chat`,
        {
          message: userMessage,
          history: historyForBackend
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.data.success) {
        const botReply = response.data.reply;
        this.addToHistory('user', userMessage);
        this.addToHistory('assistant', botReply);
        return { text: botReply, showContactBtn: false };
      } else {
        throw new Error(response.data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Backend Error:', error.message);
      return this.getFallbackResponse(userMessage);
    }
  }

  getFallbackResponse(userMessage) {
    const lower = userMessage.toLowerCase();
    
    // Who are you? / App Introduction
    if (lower.includes('who are you') || lower.includes('what are you') || lower.includes('your name')) {
      return { 
        text: "🤖 **Hello! I'm TDC Assistant - Your All-in-One App Guide!**\n\n**The Deft Crew (TDC)** is a complete ecosystem offering:\n\n🎓 **Education Abroad** - Masters, PhDs, Bachelors\n✈️ **Travel Packages** - 20+ categories worldwide\n🛍️ **Brand Discounts** - 200+ partner brands\n💼 **Job & Career** - Opportunities & growth\n📱 **Social Features** - Posts, Confessions, Connections\n🎓 **Learning Platform** - 50+ courses\n✨ **Exclusive Offers** - Save & verify discounts\n\nHow can I help you today? 🚀", 
        showContactBtn: false 
      };
    }

    // App functionalities overview
    if (lower.includes('what can you do') || lower.includes('app features') || lower.includes('functionalities')) {
      return { 
        text: "🌟 **TDC Complete Features:**\n\n**🎓 Study Abroad**\n• Masters Programs (USA, UK, Canada, Australia)\n• PhD Opportunities with Scholarships\n• Bachelors Degrees Worldwide\n• Visa & Application Assistance\n\n**✈️ Travel Packages (20+ Categories)**\n• Honeymoon Packages • Family Trips\n• Adventure Tours • Business Travel\n• Student Budget Trips • Group Discounts\n• Umrah/Hajj Packages • Cruise Deals\n• Backpacking Tours • Luxury Getaways\n\n**🛍️ Brand Discounts (200+ Brands)**\n• Fashion • Electronics • Food\n• Beauty • Fitness • Home & Living\n\n**💼 Jobs & Career**\n• Internships • Full-time Positions\n• Remote Work • Freelance Gigs\n\n**📱 Social Features**\n• Public Posts • University Confessions\n• Friend Connections • Messages • Calls\n\n**🎓 Learning Platform (50+ Courses)**\n• Web Dev • AI/ML • Digital Marketing\n• Design • Business • Languages\n\n**✨ Exclusive Offers & Events**\n• Save Discounts • Verify at Brands\n• Local Events • Webinars • Meetups\n\n**🔔 Smart Notifications**\n• Real-time alerts • Reminders • Updates\n\nWhat interests you most? 😊", 
        showContactBtn: false 
      };
    }

    // Study Abroad
    if (lower.includes('study abroad') || lower.includes('masters') || lower.includes('phd') || lower.includes('bachelors') || lower.includes('study in')) {
      return { 
        text: "🎓 **Study Abroad Programs**\n\n**Masters Degrees (2 years)**\n• USA: $30k-60k/year • Scholarships up to 50%\n• UK: £20k-40k/year • 2-year stay back\n• Canada: CAD 20k-40k/year • PR pathway\n• Australia: AUD 30k-50k/year • Work rights\n• Germany: FREE tuition • Living costs €10k/year\n\n**PhD Programs (3-5 years)**\n• Fully funded positions with stipends\n• Research assistantships: $30k-50k/year\n• Teaching opportunities available\n• Top universities worldwide\n\n**Bachelors Degrees (3-4 years)**\n• USA: $25k-55k/year • Liberal arts\n• UK: £15k-35k/year • 3-year programs\n• Europe: €10k-20k/year • English taught\n• Asia: $8k-15k/year • Affordable options\n\n**Services We Offer:**\n✅ University Selection • Application Help\n✅ Visa Guidance • Scholarship Assistance\n✅ Accommodation • Part-time job leads\n✅ Test Prep (IELTS/TOEFL/GRE/GMAT)\n\n**Want specific country/university details?** 🎯", 
        showContactBtn: false 
      };
    }

    // Travel Packages
    if (lower.includes('travel') || lower.includes('package') || lower.includes('trip') || lower.includes('vacation') || lower.includes('tour')) {
      return { 
        text: "✈️ **20+ Travel Package Categories**\n\n**Popular Categories:**\n1. 🌴 **Beach Getaways** - Thailand, Maldives, Bali\n2. 🏔️ **Mountain Adventures** - Switzerland, Nepal\n3. 🏙️ **City Breaks** - Paris, Tokyo, New York\n4. 🎢 **Family Fun** - Disneyland, Universal Studios\n5. 💑 **Honeymoon Special** - Mauritius, Fiji\n6. 🎒 **Backpacking** - Europe, Southeast Asia\n7. 🏥 **Medical Tourism** - India, Thailand, Turkey\n8. 🕌 **Umrah/Hajj** - Saudi Arabia Packages\n9. 🚢 **Cruise Deals** - Caribbean, Mediterranean\n10. 💼 **Business Travel** - Corporate rates\n11. 🎓 **Student Trips** - Budget-friendly\n12. 🎿 **Winter Sports** - Skiing in Alps\n13. 🦁 **Safari Adventures** - Africa\n14. 🍷 **Wine Tours** - France, Italy\n15. 🧘 **Wellness Retreats** - Yoga, Meditation\n16. 📸 **Photography Tours** - Iceland, Norway\n17. 🎡 **Amusement Parks** - Multiple parks\n18. 🌸 **Cherry Blossom** - Japan, Korea\n19. 🏝️ **Island Hopping** - Greece, Philippines\n20. 🎄 **Christmas Markets** - Europe\n\n**Includes:** Flights • Hotels • Transfers • Guides • Meals\n\n**Special Discounts for TDC Members!** 🎁\n\nWhich destination interests you?", 
        showContactBtn: false 
      };
    }

    // Brands & Discounts
    if (lower.includes('brand') || lower.includes('discount') || lower.includes('save') || lower.includes('verify')) {
      return { 
        text: "🛍️ **200+ Partner Brands & Discounts**\n\n**Popular Categories:**\n\n👕 **Fashion (50+ brands)**\n• Zara, H&M, Nike, Adidas, Gucci\n• 10-40% off • Seasonal sales\n\n📱 **Electronics (30+ brands)**\n• Apple, Samsung, Sony, Dell\n• 5-20% off • Student deals\n\n🍔 **Food & Dining (40+ brands)**\n• KFC, McDonald's, Starbucks\n• 15-25% off • Combo offers\n\n💄 **Beauty (25+ brands)**\n• Sephora, NYX, L'Oreal\n• 10-30% off • Free samples\n\n🏋️ **Fitness (20+ brands)**\n• Gymshark, Under Armour\n• 15-35% off • Membership deals\n\n🏠 **Home & Living (35+ brands)**\n• IKEA, Home Center\n• 10-25% off • Bulk discounts\n\n**How to Save & Verify:**\n1. 💾 **Save discount** in app\n2. 📍 **Visit brand store**\n3. ✅ **Verify identity** at checkout\n4. 🎉 **Get discount instantly!**\n\n**Special:** Save discount + QR code verification system\n\n**TDC Gold Card Holders:** Extra 15% off! 👑\n\nWant to see specific brand discounts?", 
        showContactBtn: false 
      };
    }

    // TDC Gold Card & Invitation System
    if (lower.includes('gold card') || lower.includes('invitation') || lower.includes('invite') || lower.includes('refer')) {
      return { 
        text: "👑 **TDC Gold Card - Premium Benefits**\n\n**How to Get Gold Card:**\n\n**Option 1: Free (Invitation Method)**\n✅ Invite 10 friends to join TDC\n✅ Each friend must sign up using your code\n✅ Get TDC Gold Card FREE!\n✅ Lifetime premium benefits\n\n**Option 2: Purchase Method**\n💵 One-time payment: **750 PKR**\n✅ Instant Gold Card access\n✅ No waiting period\n✅ All premium features unlocked\n\n**TDC Gold Card Benefits:**\n🎁 **Extra 15% off** on all brands\n✈️ **Special travel discounts** (up to 25%)\n🎓 **Free courses** on learning platform\n👥 **Priority support** (24/7 chat)\n⭐ **Exclusive events** access\n📱 **Gold badge** on profile\n🎯 **Early access** to sales\n💎 **Double points** on purchases\n\n**Your Invitation Code:** Use app's unique code\n\n**Progress Tracker:** See how many friends joined\n\n**Want to start inviting friends or purchase now?** 🚀", 
        showContactBtn: true 
      };
    }

    // Jobs & Career
    if (lower.includes('job') || lower.includes('career') || lower.includes('internship') || lower.includes('work')) {
      return { 
        text: "💼 **Jobs & Career Opportunities**\n\n**Categories:**\n\n👨‍💻 **Tech Jobs**\n• Software Developer • Data Scientist\n• UI/UX Designer • DevOps Engineer\n• Remote & On-site positions\n\n📊 **Business & Marketing**\n• Digital Marketing • Sales Executive\n• Business Analyst • HR Manager\n\n🎓 **Internships**\n• Paid internships (3-6 months)\n• Remote & hybrid options\n• Stipend: $500-2000/month\n\n🏢 **Full-time Positions**\n• Entry to Senior level\n• Competitive salaries\n• Benefits included\n\n💼 **Freelance Gigs**\n• Short-term projects\n• Work from anywhere\n• Flexible hours\n\n**Features:**\n✅ Resume builder • Interview prep\n✅ Job alerts • Company reviews\n✅ Skill assessments • Career counseling\n\n**New jobs posted daily!** 🔥\n\nSearch by: Role, Company, Location, Salary\n\nWhat kind of job are you looking for?", 
        showContactBtn: false 
      };
    }

    // Social Features (Posts, Confessions, Connections, Messages, Calls)
    if (lower.includes('post') || lower.includes('confession') || lower.includes('social') || lower.includes('friend') || lower.includes('message') || lower.includes('call')) {
      return { 
        text: "📱 **Social Features - Stay Connected!**\n\n**Public Posts** 📝\n• Share updates, photos, videos\n• Like, comment, share posts\n• Trending feed • Hashtags\n• Post to university/global feed\n\n**University Confessions** 🤫\n• Anonymous confessions\n• Campus stories • Advice\n• Upvote/downvote system\n• Popular confessions go viral\n\n**Friend Connections** 👥\n• Send/receive friend requests\n• Mutual friends suggestions\n• Friend lists & groups\n• Online status indicators\n\n**Messaging** 💬\n• Real-time chat\n• Group chats (up to 500 people)\n• Voice messages\n• Media sharing • Read receipts\n• Typing indicators\n\n**Voice & Video Calls** 📞\n• High-quality audio/video calls\n• 1-on-1 and group calls\n• Screen sharing\n• Call recording (with permission)\n• End-to-end encryption\n\n**Privacy Controls:**\n✅ Block users • Report content\n✅ Private accounts • Mute options\n\n**Connection Success Rate:** 99.9% uptime!\n\nWant to connect with friends or share something? 🌟", 
        showContactBtn: false 
      };
    }

    // Notifications
    if (lower.includes('notification') || lower.includes('alert') || lower.includes('reminder')) {
      return { 
        text: "🔔 **Smart Notification System**\n\n**Real-time Alerts:**\n\n💎 **Points & Rewards**\n• Points earned • Level ups\n• Reward redemptions\n\n🛍️ **Brands & Discounts**\n• New brand partnerships\n• Flash sales (30 min before)\n• Expiring discounts\n\n✈️ **Travel Updates**\n• Price drops on packages\n• Last-minute deals\n• Booking confirmations\n\n👥 **Social Notifications**\n• New friend requests\n• Messages & calls\n• Post likes/comments\n• Confession responses\n\n🎓 **Learning Platform**\n• Course reminders\n• Assignment due dates\n• New course alerts\n• Certificate ready\n\n💼 **Jobs**\n• New job matches\n• Application updates\n• Interview reminders\n\n🎉 **Events**\n• Upcoming events nearby\n• Registration reminders\n• Event changes\n\n✨ **Exclusive Offers**\n• Personalized deals\n• Birthday discounts\n• Anniversary offers\n\n**Settings:**\n✅ Customize notification preferences\n✅ Do Not Disturb mode\n✅ Weekly digest option\n\n**Never miss important updates!** 🚀", 
        showContactBtn: false 
      };
    }

    // Learning Platform / Courses
    if (lower.includes('course') || lower.includes('learn') || lower.includes('learning') || lower.includes('study') || lower.includes('certificate')) {
      return { 
        text: "🎓 **TDC Learning Platform - 50+ Courses**\n\n**Course Categories:**\n\n💻 **Programming & Tech (12 courses)**\n• Web Dev (HTML/CSS/JS/React)\n• Python Programming\n• Data Science & AI/ML\n• Mobile App Development\n• Cybersecurity\n• Cloud Computing (AWS/Azure)\n• Database Management\n• DevOps & Git\n• UI/UX Design\n• Game Development\n• Blockchain Basics\n• IoT Fundamentals\n\n📈 **Business & Marketing (10 courses)**\n• Digital Marketing\n• Social Media Management\n• SEO & Analytics\n• Business Strategy\n• Project Management (PMP)\n• Entrepreneurship\n• Sales Techniques\n• Brand Management\n• Financial Analysis\n• E-commerce Mastery\n\n🎨 **Design & Creative (8 courses)**\n• Graphic Design (Photoshop/Illustrator)\n• Video Editing\n• 3D Modeling\n• Animation Basics\n• Photography\n• Content Writing\n• Podcasting\n• Motion Graphics\n\n🌐 **Languages (6 courses)**\n• English (IELTS/TOEFL prep)\n• Spanish • French • German\n• Mandarin • Japanese\n\n💼 **Career Development (8 courses)**\n• Resume Writing\n• Interview Preparation\n• Public Speaking\n• Leadership Skills\n• Time Management\n• Negotiation Skills\n• Remote Work Mastery\n• Personal Branding\n\n🧠 **Personal Growth (6 courses)**\n• Mindfulness & Meditation\n• Financial Literacy\n• Critical Thinking\n• Emotional Intelligence\n• Productivity Hacks\n• Stress Management\n\n**Course Features:**\n✅ Video lectures • Quizzes\n✅ Assignments • Projects\n✅ Discussion forums\n✅ Certificate on completion\n✅ Lifetime access\n✅ Mobile-friendly\n\n**Special:** TDC Gold Card = 50% off all courses!\n\n**Free courses available for students!** 🎓\n\nWhich course interests you?", 
        showContactBtn: false 
      };
    }

    // Exclusive Offers & Events
    if (lower.includes('exclusive') || lower.includes('offer') || lower.includes('event') || lower.includes('webinar')) {
      return { 
        text: "✨ **Exclusive Offers & Events**\n\n**🔥 Current Hot Offers:**\n\n**Brand Discounts:**\n• Nike: Buy 1 Get 1 50% off\n• Apple: Student discount 15%\n• Zara: Season end sale 40% off\n• Amazon: Prime exclusive deals\n\n**Travel Deals:**\n• Dubai: 3 nights @ $299\n• Thailand: 5 days @ $399\n• Europe tour: 20% early bird\n\n**Learning Offers:**\n• Any course @ $9.99 (limited)\n• Buy 2 Get 1 Free on courses\n• Free webinar access\n\n**🎪 Upcoming Events:**\n\n**This Week:**\n• 📅 Career Fair - March 25\n• 🎓 Study Abroad Webinar - March 26\n• 🤝 Networking Meetup - March 27\n\n**This Month:**\n• 🛍️ Mega Shopping Festival\n• ✈️ Travel Expo 2024\n• 💻 Hackathon 2024\n• 🎓 Graduation Ceremony\n\n**How to Save Offers:**\n1. 👆 Tap \"Save Offer\" button\n2. 📱 QR code generated\n3. 🏪 Visit partner brand\n4. 🔍 Scan QR to verify identity\n5. 💰 Get discount instantly!\n\n**Reminder:** Offers expire within 7 days\n\n**Want to see current offers near you?** 🎯", 
        showContactBtn: false 
      };
    }

    // Points & Rewards System
    if (lower.includes('point') || lower.includes('earn') || lower.includes('reward') || lower.includes('cashback')) {
      return { 
        text: "💎 **TDC Rewards System**\n\n**How to Earn Points:**\n\n🛍️ **Shopping**\n• Spend $1 = 10 points\n• First purchase: +500 bonus\n• Daily check-in: +50 points\n\n👥 **Social Activity**\n• Post: +20 points\n• Comment: +5 points\n• Friend accepted: +50 points\n• Confession liked: +10 points\n\n🎓 **Learning**\n• Complete course: +500 points\n• Pass quiz: +50 points\n• Get certificate: +200 points\n\n💼 **Jobs**\n• Apply for job: +25 points\n• Get interview: +100 points\n• Get hired: +1000 points\n\n✨ **Special Bonuses**\n• Refer friend: +500 points\n• Event attendance: +200 points\n• Daily streak: +50/day\n• Birthday: +1000 points\n\n**Redeem Points:**\n🎁 **500 points** = $5 voucher\n🎁 **1000 points** = Free course\n🎁 **5000 points** = TDC Gold Card\n🎁 **10000 points** = Free travel package\n\n**TDC Gold Card = 2x points on everything!** 👑\n\n**Current Points:** Check your profile\n\nStart earning now! 🚀", 
        showContactBtn: false 
      };
    }

    // Help / Support
    if (lower.includes('help') || lower.includes('support')) {
      return { 
        text: "🤔 **How can I help you today?**\n\n**Quick Topics:**\n\n🎓 \"Study abroad programs\" - Masters, PhD, Bachelors\n✈️ \"Travel packages\" - 20+ categories\n🛍️ \"Brand discounts\" - 200+ brands\n💼 \"Jobs & career\" - Internships & full-time\n👑 \"TDC Gold Card\" - Invite 10 or buy for 750 PKR\n📱 \"Social features\" - Posts, Confessions, Friends\n💬 \"Messages & calls\" - Connect with friends\n🔔 \"Notifications\" - Real-time alerts\n🎓 \"Learning platform\" - 50+ courses\n✨ \"Exclusive offers\" - Save & verify discounts\n🎪 \"Events\" - Webinars & meetups\n💎 \"Earn points\" - Rewards system\n\n**Need human help?** Tap contact button below! 📞\n\nWhat would you like to know? 😊", 
        showContactBtn: true 
      };
    }

    // Default response
    return {
      text: "🤔 **I'm here to help with TDC App!**\n\nTry asking me about:\n\n🎓 **Study Abroad** (Masters/PhD/Bachelors)\n✈️ **Travel Packages** (20+ categories)\n🛍️ **Brand Discounts** (200+ brands)\n💼 **Jobs & Career** (Internships/Full-time)\n👑 **TDC Gold Card** (Invite 10 or 750 PKR)\n📱 **Social Features** (Posts/Confessions/Calls)\n🎓 **Learning Platform** (50+ courses)\n✨ **Exclusive Offers** (Save & verify)\n🔔 **Notifications** (Real-time alerts)\n💎 **Earn Points** (Rewards system)\n\n**Just type your question!** 💬\n\nOr tap below for human support 📞", 
      showContactBtn: true
    };
  }

  async sendMessage(message) {
    try {
      const response = await this.sendMessageToBackend(message);
      return response;
    } catch (error) {
      console.log('⚠️ Using fallback response');
      return this.getFallbackResponse(message);
    }
  }

  async checkBackendHealth() {
    try {
      console.log('🔍 Checking backend at:', `${SERVER_URL}/api/chat/health`);
      const response = await axios.get(`${SERVER_URL}/api/chat/health`, { 
        timeout: 5000 
      });
      const isHealthy = response.data.status === 'ok';
      this.isBackendAvailable = isHealthy;
      console.log(isHealthy ? '✅ Backend connected' : '❌ Backend failed');
      return isHealthy;
    } catch (error) {
      console.log('❌ Backend health check failed:', error.message);
      this.isBackendAvailable = false;
      return false;
    }
  }

  getServerUrl() {
    return SERVER_URL;
  }
}

export default new AIService();