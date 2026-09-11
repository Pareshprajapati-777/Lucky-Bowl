import os
import json
import time
from datetime import datetime
import streamlit as st
import pandas as pd
from bundle_html import get_standalone_html

# =========================================================
# Page Configuration
# =========================================================
st.set_page_config(
    page_title="Spin Luck - 3D Glass Bowl Lucky Draw",
    page_icon="🎰",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# =========================================================
# Default Constants & Presets
# =========================================================
DEFAULT_NAMES = [
    'Paresh',
    'Deepak',
    'Meet',
    'Pritam',
    'Krish',
    'Kajal',
    'Trisha',
    'Khushi'
]

PRESETS = {
    "Default Office Team (8 Candidates)": DEFAULT_NAMES,
    "Grand Lucky Draw (10 Candidates)": [
        "Sophia Martinez", "Liam Johnson", "Emma Watson", "Noah Smith",
        "Olivia Brown", "Ethan Davis", "Isabella Garcia", "Lucas Wilson",
        "Mia Anderson", "Jackson Taylor"
    ],
    "Festive Giveaway (12 Chits)": [
        f"Lucky Chit #{i:02d}" for i in range(1, 13)
    ],
    "Lucky Number Tokens (1 to 20)": [
        f"Token #{i}" for i in range(1, 21)
    ]
}

# =========================================================
# Session State Setup
# =========================================================
if "names" not in st.session_state:
    st.session_state.names = list(DEFAULT_NAMES)

if "history" not in st.session_state:
    st.session_state.history = []

if "bowl_version" not in st.session_state:
    st.session_state.bowl_version = 0

if "trigger_draw" not in st.session_state:
    st.session_state.trigger_draw = False

# =========================================================
# Custom Luxury Obsidian & Gold Styling
# =========================================================
st.markdown("""
<style>
    /* Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Outfit:wght@300;400;500;600;700&display=swap');

    /* Main App Background & Reset */
    .stApp {
        background: linear-gradient(180deg, #07090f 0%, #0a0d17 50%, #06080e 100%);
        color: #f1f5f9;
        font-family: 'Outfit', sans-serif;
    }

    /* Top padding removal for immersive 3D stage */
    .block-container {
        padding-top: 1.2rem;
        padding-bottom: 2rem;
        max-width: 100%;
    }

    /* Header Banner */
    .spin-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(18, 22, 34, 0.7);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(212, 175, 55, 0.25);
        border-radius: 18px;
        padding: 16px 24px;
        margin-bottom: 18px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
    }
    .spin-header-brand {
        display: flex;
        align-items: center;
        gap: 16px;
    }
    .spin-icon-box {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: linear-gradient(135deg, #fbe69b 0%, #d4af37 60%, #9e7520 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
        box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);
    }
    .spin-title {
        font-family: 'Cinzel', serif;
        font-size: 24px;
        font-weight: 800;
        letter-spacing: 2.5px;
        background: linear-gradient(135deg, #ffffff 0%, #fbe69b 50%, #d4af37 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
        line-height: 1.1;
    }
    .spin-subtitle {
        font-size: 13px;
        color: #94a3b8;
        letter-spacing: 0.8px;
        margin-top: 3px;
    }
    .spin-badges {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }
    .spin-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 30px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.5px;
    }
    .spin-pill-gold {
        background: rgba(212, 175, 55, 0.12);
        color: #fbe69b;
        border: 1px solid rgba(212, 175, 55, 0.4);
    }
    .spin-pill-green {
        background: rgba(34, 197, 94, 0.12);
        color: #4ade80;
        border: 1px solid rgba(34, 197, 94, 0.35);
    }

    /* 3D Viewport Container Card */
    .viewport-card {
        border-radius: 22px;
        overflow: hidden;
        border: 1px solid rgba(212, 175, 55, 0.3);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(212, 175, 55, 0.12);
        background: #0c0f17;
        margin-bottom: 24px;
    }

    /* Completely Hide Sidebar and Collapse Toggle */
    section[data-testid="stSidebar"], 
    [data-testid="collapsedControl"],
    button[kind="header"] {
        display: none !important;
    }

    /* Streamlit Buttons Styled with Luxury Gold */
    .stButton > button {
        background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(18, 22, 34, 0.8) 100%) !important;
        color: #fbe69b !important;
        border: 1px solid rgba(212, 175, 55, 0.45) !important;
        border-radius: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.5px !important;
        transition: all 0.25s ease !important;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important;
    }
    .stButton > button:hover {
        background: linear-gradient(135deg, #fbe69b 0%, #d4af37 60%, #9e7520 100%) !important;
        color: #0b0e14 !important;
        border-color: #ffd700 !important;
        box-shadow: 0 0 22px rgba(212, 175, 55, 0.6) !important;
        transform: translateY(-2px);
    }

    /* Primary CTA Button */
    .stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #fbe69b 0%, #d4af37 55%, #a67c1e 100%) !important;
        color: #080a0f !important;
        font-weight: 700 !important;
        border: 1px solid #ffe082 !important;
        box-shadow: 0 0 25px rgba(212, 175, 55, 0.5) !important;
    }

    /* Metrics Styling */
    div[data-testid="stMetricValue"] {
        color: #fbe69b !important;
        font-family: 'Cinzel', serif !important;
        font-weight: 700 !important;
    }
    div[data-testid="stMetricLabel"] {
        color: #94a3b8 !important;
        font-weight: 500 !important;
    }

    /* Tabs Styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background: rgba(18, 22, 34, 0.6);
        padding: 6px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: 10px;
        color: #94a3b8;
        font-weight: 600;
        padding: 10px 18px;
    }
    .stTabs [aria-selected="true"] {
        background: rgba(212, 175, 55, 0.18) !important;
        color: #fbe69b !important;
        border: 1px solid rgba(212, 175, 55, 0.35) !important;
    }

    /* Dataframe Table styling */
    .stDataFrame {
        border-radius: 14px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    /* Mobile Responsive Optimizations */
    @media (max-width: 768px) {
        .block-container {
            padding-top: 0.6rem;
            padding-bottom: 1rem;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }
        .spin-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 14px;
            margin-bottom: 12px;
        }
        .spin-header-brand {
            gap: 12px;
        }
        .spin-icon-box {
            width: 38px;
            height: 38px;
            font-size: 20px;
            border-radius: 10px;
        }
        .spin-title {
            font-size: 19px;
            letter-spacing: 1.5px;
        }
        .spin-subtitle {
            font-size: 11px;
        }
        .spin-badges {
            width: 100%;
            justify-content: flex-start;
            gap: 6px;
        }
        .spin-pill {
            padding: 4px 10px;
            font-size: 11px;
        }
        .viewport-card {
            border-radius: 16px;
            margin-bottom: 16px;
        }
    }
</style>
""", unsafe_allow_html=True)

# =========================================================
# Header
# =========================================================
st.markdown(f"""
<div class="spin-header">
    <div class="spin-header-brand">
        <div class="spin-icon-box">🎰</div>
        <div>
            <h1 class="spin-title">SPIN LUCK</h1>
            <div class="spin-subtitle">3D Glass Bowl Lucky Draw • लकी चिट • Realistic Origami Reveal</div>
        </div>
    </div>
    <div class="spin-badges">
        <div class="spin-pill spin-pill-gold">
            <span>🔮</span>
            <span>{len(st.session_state.names)} Chits Inside Bowl</span>
        </div>
        <div class="spin-pill spin-pill-green">
            <span>✨</span>
            <span>Procedural Audio & WebGL Active</span>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# =========================================================
# Main 3D WebGL Viewport Stage
# =========================================================
try:
    # Generate standalone HTML containing current names and draw trigger
    trigger_now = st.session_state.trigger_draw
    if trigger_now:
        # reset trigger state after consuming
        st.session_state.trigger_draw = False

    standalone_html = get_standalone_html(
        names=st.session_state.names,
        trigger_draw=trigger_now
    )

    st.markdown('<div class="viewport-card">', unsafe_allow_html=True)
    st.components.v1.html(
        standalone_html,
        height=860,
        scrolling=False
    )
    st.markdown('</div>', unsafe_allow_html=True)

except Exception as e:
    st.error(f"Error loading 3D Glass Bowl scene: {e}")
    st.info("Ensure `npm run build` has been run to generate the bundle.")


