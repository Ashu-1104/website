'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ElementType } from 'react';
import {
  Palette,
  SlidersHorizontal,
  Smile,
  PersonStanding,
  FileText,
  Image as ImageIcon,
  Play,
  X,
  RefreshCcw,
  PencilLine,
  Sparkles,
  Search,
  Upload,
  UserRound,
  User,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import styles from './CreateYourOwnAICharacter.module.css';
import CharacterSeoBlock from './CharacterSeoBlock';

type StyleOption = 'realistic' | 'anime' | 'furry' | 'fantasy';
type GenderOption = 'female' | 'male' | 'trans';
type EthnicityOption =
  | 'asian'
  | 'black'
  | 'white'
  | 'latina'
  | 'arab'
  | 'indian'
  | 'elf'
  | 'alien'
  | 'demon'
  | 'custom';

type SkinToneOption = 'veryLight' | 'light' | 'olive' | 'tan' | 'brown' | 'deep';
type EyeColorOption = 'blue' | 'green' | 'brown' | 'hazel' | 'amber' | 'gray';
type HairColorOption =
  | 'platinum'
  | 'blonde'
  | 'strawberry'
  | 'lightBrown'
  | 'brown'
  | 'darkBrown'
  | 'black'
  | 'red'
  | 'auburn'
  | 'silver';
type HairStyleOption =
  | 'braided'
  | 'long'
  | 'bangs'
  | 'ponytail'
  | 'short'
  | 'wavy'
  | 'curly'
  | 'bob'
  | 'bun'
  | 'pixie';

type BodyTypeOption = 'slim' | 'athletic' | 'voluptuous' | 'curvy';
type BreastSizeOption = 'flat' | 'small' | 'medium' | 'large' | 'huge';
type ButtSizeOption = 'small' | 'athletic' | 'medium' | 'large';

type DetailsPickerType = 'voice' | 'personality' | 'occupation' | 'relationship' | 'hobby' | 'fetish';

interface PartnerFlowState {
  // `progressStep` represents the furthest step the user has reached (and thus completed previous steps).
  // `viewStep` is the step currently being edited. Navigating via the progress bar/back does not change progress.
  progressStep: number;
  viewStep: number;
  style: StyleOption | null;
  gender: GenderOption;
  ethnicity: EthnicityOption | null;
  skinTone: SkinToneOption | null;
  age: number;
  eyeColor: EyeColorOption | null;
  hairColor: HairColorOption | null;
  hairStyle: HairStyleOption | null;
  bodyType: BodyTypeOption | null;
  breastSize: BreastSizeOption | null;
  buttSize: ButtSizeOption | null;

  // Details step
  characterName: string;
  voice: string | null;
  personality: string | null;
  occupation: string | null;
  relationship: string | null;
  hobby: string | null;
  fetish: string | null;

  // Advanced Details (optional)
  characterDescription: string;
  firstMessage: string;
  systemPrompt: string;
}

const STORAGE_KEY = 'ai-partner-flow';
// The wizard has 6 steps in the progress bar, but only up to "Result" is implemented right now.
const MAX_IMPLEMENTED_STEP = 5;

const steps = [
  { id: 'style', label: 'Style', icon: Palette },
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'face', label: 'Face', icon: Smile },
  { id: 'body', label: 'Body', icon: PersonStanding },
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'result', label: 'Result', icon: ImageIcon },
];

const styleOptions: Array<{
  id: StyleOption;
  label: string;
  description: string;
  badge?: string;
}> = [
  { id: 'realistic', label: 'Realistic', description: 'Lifelike visuals with natural detail.' },
  { id: 'anime', label: 'Anime', description: 'Stylized anime aesthetics and colors.' },
  { id: 'furry', label: 'Furry', description: 'Anthropomorphic, expressive features.' },
  { id: 'fantasy', label: 'Fantasy', description: 'Imaginative, otherworldly designs.' },
];

const genderOptions: Array<{ id: GenderOption; label: string; icon: ElementType }> = [
  { id: 'female', label: 'Female', icon: UserRound },
  { id: 'male', label: 'Male', icon: User },
  { id: 'trans', label: 'Trans', icon: UserCheck },
];

const ethnicityOptions: Array<{ id: EthnicityOption; label: string; premium?: boolean }> = [
  { id: 'asian', label: 'Asian' },
  { id: 'black', label: 'Black' },
  { id: 'white', label: 'White' },
  { id: 'latina', label: 'Latina' },
  { id: 'arab', label: 'Arab' },
  { id: 'indian', label: 'Indian' },
  { id: 'elf', label: 'Elf' },
  { id: 'alien', label: 'Alien' },
  { id: 'demon', label: 'Demon' },
  { id: 'custom', label: 'Custom', premium: true },
];

const skinTones: Array<{ id: SkinToneOption; label: string; color: string }> = [
  { id: 'veryLight', label: 'Very Light', color: '#fde7d2' },
  { id: 'light', label: 'Light', color: '#f7d3b0' },
  { id: 'olive', label: 'Olive', color: '#c7905b' },
  { id: 'tan', label: 'Tan', color: '#9a6a42' },
  { id: 'brown', label: 'Brown', color: '#6f4524' },
  { id: 'deep', label: 'Deep', color: '#3f240f' },
];

const eyeColors: Array<{ id: EyeColorOption; label: string; background: string }> = [
  { id: 'blue', label: 'Blue', background: 'radial-gradient(circle at 35% 45%, #74d3ff 0%, #1d4ed8 55%, #0b1020 100%)' },
  { id: 'green', label: 'Green', background: 'radial-gradient(circle at 35% 45%, #8cffb5 0%, #16a34a 55%, #0b1020 100%)' },
  { id: 'brown', label: 'Brown', background: 'radial-gradient(circle at 35% 45%, #f4c27a 0%, #7c2d12 55%, #0b1020 100%)' },
  { id: 'hazel', label: 'Hazel', background: 'radial-gradient(circle at 35% 45%, #ffe08a 0%, #a16207 55%, #0b1020 100%)' },
  { id: 'amber', label: 'Amber', background: 'radial-gradient(circle at 35% 45%, #ffb86b 0%, #ea580c 55%, #0b1020 100%)' },
  { id: 'gray', label: 'Gray', background: 'radial-gradient(circle at 35% 45%, #d6dbe6 0%, #64748b 55%, #0b1020 100%)' },
];

const hairColors: Array<{ id: HairColorOption; label: string; background: string }> = [
  { id: 'platinum', label: 'Platinum', background: 'repeating-linear-gradient(120deg, #f5f6f7 0 10px, #d7dbe0 10px 20px)' },
  { id: 'blonde', label: 'Blonde', background: 'repeating-linear-gradient(120deg, #f7d9a6 0 10px, #caa06a 10px 20px)' },
  { id: 'strawberry', label: 'Strawberry', background: 'repeating-linear-gradient(120deg, #f8b2a8 0 10px, #c76a57 10px 20px)' },
  { id: 'lightBrown', label: 'Light Brown', background: 'repeating-linear-gradient(120deg, #d1a77a 0 10px, #8b5e34 10px 20px)' },
  { id: 'brown', label: 'Brown', background: 'repeating-linear-gradient(120deg, #b07a4a 0 10px, #6b3f1d 10px 20px)' },
  { id: 'darkBrown', label: 'Dark Brown', background: 'repeating-linear-gradient(120deg, #6a3f2a 0 10px, #3b2418 10px 20px)' },
  { id: 'black', label: 'Black', background: 'repeating-linear-gradient(120deg, #2b2f36 0 10px, #0b0e14 10px 20px)' },
  { id: 'red', label: 'Red', background: 'repeating-linear-gradient(120deg, #f06a52 0 10px, #9a3412 10px 20px)' },
  { id: 'auburn', label: 'Auburn', background: 'repeating-linear-gradient(120deg, #c86b3d 0 10px, #7c2d12 10px 20px)' },
  { id: 'silver', label: 'Silver', background: 'repeating-linear-gradient(120deg, #e5e7eb 0 10px, #9ca3af 10px 20px)' },
];

const hairStyles: Array<{ id: HairStyleOption; label: string }> = [
  { id: 'braided', label: 'Braided' },
  { id: 'long', label: 'Long' },
  { id: 'bangs', label: 'Bangs' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'short', label: 'Short' },
  { id: 'wavy', label: 'Wavy' },
  { id: 'curly', label: 'Curly' },
  { id: 'bob', label: 'Bob' },
  { id: 'bun', label: 'Bun' },
  { id: 'pixie', label: 'Pixie' },
];

const bodyTypes: Array<{ id: BodyTypeOption; label: string }> = [
  { id: 'slim', label: 'Slim' },
  { id: 'athletic', label: 'Athletic' },
  { id: 'voluptuous', label: 'Voluptuous' },
  { id: 'curvy', label: 'Curvy' },
];

const breastSizes: Array<{ id: BreastSizeOption; label: string }> = [
  { id: 'flat', label: 'Flat' },
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
  { id: 'huge', label: 'Huge' },
];

const buttSizes: Array<{ id: ButtSizeOption; label: string }> = [
  { id: 'small', label: 'Small' },
  { id: 'athletic', label: 'Athletic' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];

// Picker option lists used by the Details modals. These are placeholders for now and can be wired to an API later.
const detailsOptions: Record<DetailsPickerType, Array<{ value: string; emoji?: string; premium?: boolean }>> = {
  voice: [
    { value: 'Honey' },
    { value: 'Aurora' },
    { value: 'ASMR' },
    { value: 'Hottie' },
    { value: 'JOI', premium: true, emoji: '💎' },
    { value: 'Sorority', premium: true, emoji: '💎' },
    { value: 'Posh', premium: true, emoji: '💎' },
    { value: 'Smooth', premium: true, emoji: '💎' },
    { value: 'Adventurer', premium: true, emoji: '💎' },
    { value: 'Conspiracist', premium: true, emoji: '💎' },
    { value: 'Casual', premium: true, emoji: '💎' },
    { value: 'Coach', premium: true, emoji: '💎' },
    { value: 'Formal', premium: true, emoji: '💎' },
    { value: 'Quirky', premium: true, emoji: '💎' },
    { value: 'Nerdy', premium: true, emoji: '💎' },
    { value: 'Adorable', premium: true, emoji: '💎' },
  ],
  personality: [
    { value: 'Custom', emoji: '🖌️' },
    { value: 'None', emoji: '⚪' },
    { value: 'Sweet', emoji: '🥰' },
    { value: 'Flirty', emoji: '💋' },
    { value: 'Shy', emoji: '🌸' },
    { value: 'Playful', emoji: '✨' },
    { value: 'Mysterious', emoji: '🌙' },
    { value: 'Sassy', emoji: '💅' },
    { value: 'Tsundere', emoji: '😤' },
    { value: 'Yandere', emoji: '🗡️' },
    { value: 'Dominant', emoji: '⛓️' },
    { value: 'Submissive', emoji: '🥺' },
    { value: 'Intellectual', emoji: '🧠' },
    { value: 'Adventurous', emoji: '🔥' },
    { value: 'Caring', emoji: '💖' },
    { value: 'Witty', emoji: '😉' },
  ],
  occupation: [
    { value: 'Custom', emoji: '🖌️' },
    { value: 'None', emoji: '⚪' },
    { value: 'Stripper', emoji: '💃' },
    { value: 'Food Truck Owner', emoji: '🚚' },
    { value: 'Doctor', emoji: '👨‍⚕️' },
    { value: 'Superhero', emoji: '🦸' },
    { value: 'Professional Gamer', emoji: '🎮' },
    { value: 'Teacher', emoji: '👩‍🏫' },
    { value: 'Artist', emoji: '🎨' },
    { value: 'Social Media Influencer', emoji: '📱' },
    { value: 'Dating Coach', emoji: '💌' },
    { value: 'Life Coach', emoji: '🌱' },
    { value: 'Dominatrix', emoji: '⛓️' },
    { value: 'Dungeon Master', emoji: '🔗' },
    { value: 'Escort', emoji: '💋' },
    { value: 'Warrior', emoji: '⚔️' },
  ],
  relationship: [
    { value: 'Custom', emoji: '🖌️' },
    { value: 'None', emoji: '⚪' },
    { value: 'Step-Mum', emoji: '🫂' },
    { value: 'Step-Sister', emoji: '👭' },
    { value: 'Step-Daughter', emoji: '👩‍👧' },
    { value: 'Lover', emoji: '❤️' },
    { value: 'Friend', emoji: '👬' },
    { value: 'Stranger', emoji: '🤔' },
    { value: 'Crush', emoji: '😍' },
    { value: 'Ex', emoji: '💔' },
    { value: 'Roommate', emoji: '🏠' },
    { value: 'Colleague', emoji: '💼' },
    { value: 'Classmate', emoji: '📚' },
    { value: 'Mentor', emoji: '🧠' },
    { value: 'Student', emoji: '📝' },
    { value: 'Neighbor', emoji: '🏡' },
  ],
  hobby: [
    { value: 'Reading', emoji: '📚' },
    { value: 'Gaming', emoji: '🎮' },
    { value: 'Cooking', emoji: '🍳' },
    { value: 'Painting', emoji: '🎨' },
    { value: 'Writing', emoji: '✍️' },
    { value: 'Photography', emoji: '📸' },
    { value: 'Playing Guitar', emoji: '🎸' },
    { value: 'Singing', emoji: '🎤' },
    { value: 'Dancing', emoji: '💃' },
    { value: 'Sculpting', emoji: '🗿' },
    { value: 'Knitting', emoji: '🧶' },
    { value: 'Gardening', emoji: '🌿' },
    { value: 'Hiking', emoji: '🌲' },
    { value: 'Camping', emoji: '🏕️' },
    { value: 'Fishing', emoji: '🎣' },
    { value: 'Bird Watching', emoji: '🦢' },
    { value: 'Stargazing', emoji: '🔭' },
    { value: 'Rock Climbing', emoji: '🧗' },
    { value: 'Yoga', emoji: '🧘' },
    { value: 'Meditation', emoji: '🧘‍♀️' },
    { value: 'Running', emoji: '🏃' },
    { value: 'Cycling', emoji: '🚴' },
    { value: 'Swimming', emoji: '🏊' },
    { value: 'Weightlifting', emoji: '🏋️' },
    { value: 'Martial Arts', emoji: '🥋' },
    { value: 'Team Sports', emoji: '⚽' },
    { value: 'Board Games', emoji: '🎲' },
    { value: 'Puzzles', emoji: '🧩' },
    { value: 'Chess', emoji: '♟️' },
    { value: 'Collecting Stamps', emoji: '✉️' },
    { value: 'Collecting Coins', emoji: '🪙' },
    { value: 'Collecting Antiques', emoji: '🏺' },
    { value: 'Model Building', emoji: '✈️' },
    { value: 'Woodworking', emoji: '🪵' },
    { value: 'Pottery', emoji: '🏺' },
    { value: 'Calligraphy', emoji: '🖋️' },
    { value: 'Baking', emoji: '🍰' },
    { value: 'Brewing', emoji: '🍺' },
    { value: 'Mixology', emoji: '🍸' },
    { value: 'Learning Languages', emoji: '🗣️' },
    { value: 'Astronomy', emoji: '🪐' },
    { value: 'Genealogy', emoji: '🌳' },
    { value: 'Volunteering', emoji: '🤝' },
    { value: 'Blogging', emoji: '💻' },
    { value: 'Coding', emoji: '⌨️' },
    { value: 'Robotics', emoji: '🤖' },
    { value: 'Astrology', emoji: '✨' },
    { value: 'Tarot Reading', emoji: '🔮' },
    { value: 'LARPing', emoji: '⚔️' },
    { value: 'Urban Exploration', emoji: '🏙️' },
    { value: 'Competitive Eating', emoji: '🌭' },
    { value: 'Extreme Ironing', emoji: '🧺' },
    { value: 'Urban Foraging', emoji: '🌿' },
    { value: 'Guerilla Gardening', emoji: '🌻' },
    { value: 'Cryptid Hunting', emoji: '🐾' },
    { value: 'Ghost Hunting', emoji: '👻' },
    { value: 'Competitive Duck Herding', emoji: '🦆' },
    { value: 'Taxidermy Art', emoji: '🦋' },
    { value: 'Circus Arts', emoji: '🎪' },
    { value: 'Lock Picking', emoji: '🔒' },
    { value: 'Parkour', emoji: '🤸' },
    { value: 'Free Diving', emoji: '🌊' },
    { value: 'Soap Carving', emoji: '🧼' },
    { value: 'Miniature Food Crafting', emoji: '👉' },
    { value: 'Competitive Dog Grooming', emoji: '🐩' },
    { value: 'Beetle Fighting', emoji: '🐞' },
    { value: 'Ant Keeping', emoji: '🐜' },
    { value: 'Cloud Watching', emoji: '☁️' },
    { value: 'Trainspotting', emoji: '🚂' },
    { value: 'Dumpster Diving', emoji: '🗑️' },
    { value: 'Geocaching', emoji: '🗺️' },
    { value: 'Historical Reenactment', emoji: '⚔️' },
    { value: 'Competitive Programming', emoji: '💻' },
    { value: "Speedcubing (Rubik's)", emoji: '🧊' },
    { value: 'Metal Forging', emoji: '🔨' },
    { value: 'Glassblowing', emoji: '🔥' },
    { value: 'Toy Collecting', emoji: '🧸' },
    { value: 'Vintage Computing', emoji: '💾' },
    { value: 'Urban Beekeeping', emoji: '🐝' },
    { value: 'Fermentation', emoji: '🥬' },
    { value: 'Astrophotography', emoji: '🌌' },
    { value: 'Rock Balancing', emoji: '🗿' },
    { value: 'Sand Sculpting', emoji: '🏖️' },
    { value: 'Ice Sculpting', emoji: '❄️' },
    { value: 'Ventriloquism', emoji: '🗣️' },
    { value: 'Puppetry', emoji: '🎭' },
    { value: 'Kitesurfing', emoji: '🪁' },
    { value: 'Slacklining', emoji: '🦒' },
    { value: 'Poi Spinning', emoji: '🔥' },
    { value: 'Calligraffiti', emoji: '🖋️' },
    { value: 'Aquascaping', emoji: '🐟' },
    { value: 'Terrarium Building', emoji: '🌱' },
    { value: 'Whittling', emoji: '🔪' },
    { value: 'Fandom Theorizing', emoji: '⭐' },
    { value: 'Competitive Sleeping', emoji: '😴' },
    { value: 'Extreme Pogo Sticking', emoji: '🦒' },
    { value: 'Air Guitar Championships', emoji: '🎸' },
    { value: 'Hunting', emoji: '🏹' },
  ],
  fetish: [
    { value: 'Vanilla', emoji: '🍦' },
    { value: 'Roleplay', emoji: '🎭' },
    { value: 'Lingerie', emoji: '👙' },
    { value: 'High Heels', emoji: '👠' },
    { value: 'Stockings', emoji: '🧦' },
    { value: 'Uniforms', emoji: '👮' },
    { value: 'Feet', emoji: '🦶' },
    { value: 'Muscle Worship', emoji: '💪' },
    { value: 'Crossdressing', emoji: '👗' },
    { value: 'Leather', emoji: '🧥' },
    { value: 'Latex', emoji: '🧤' },
    { value: 'Corsets', emoji: '⌛' },
    { value: 'Spanking', emoji: '🖐️' },
    { value: 'Tickling', emoji: '👉' },
    { value: 'Hair Fetish', emoji: '✂️' },
    { value: 'Voyeurism', emoji: '👀' },
    { value: 'Exhibitionism', emoji: '😳' },
    { value: 'Public Play', emoji: '🖼️' },
    { value: 'Group Encounters', emoji: '👥' },
    { value: 'Swinging', emoji: '🔄' },
    { value: 'Polyamory', emoji: '💞' },
    { value: 'Blindfolds', emoji: '🙈' },
    { value: 'Gags', emoji: '🤐' },
    { value: 'Collars', emoji: '🔗' },
    { value: 'Bondage (Shibari)', emoji: '🪢' },
    { value: 'Impact Play', emoji: '💥' },
    { value: 'Temperature Play', emoji: '❄️' },
    { value: 'Wax Play', emoji: '🕯️' },
    { value: 'Sensory Deprivation', emoji: '⚫' },
    { value: 'Humiliation', emoji: '😳' },
    { value: 'Objectification', emoji: '🧍' },
    { value: 'FemDom', emoji: '👑' },
    { value: 'Dom', emoji: '👑' },
    { value: 'FemSub', emoji: '🧎‍♀️' },
    { value: 'Sub', emoji: '🧎' },
    { value: 'Hotwifing', emoji: '🔥' },
    { value: 'Cuckolding', emoji: '💔' },
    { value: 'Stag', emoji: '👁️' },
    { value: 'Sharing', emoji: '🎁' },
    { value: 'Compersion Kink', emoji: '😊' },
    { value: 'Clean-up Duty', emoji: '🧹' },
    { value: 'Masks', emoji: '🎭' },
    { value: 'Tentacles', emoji: '🐙' },
    { value: 'Body Modification', emoji: '🗡️' },
    { value: 'Freeuse', emoji: '🔓' },
    { value: 'Hypnosis', emoji: '🌀' },
    { value: 'Mind Control', emoji: '🧠' },
    { value: 'Pet Play', emoji: '🐶' },
    { value: 'Furry Fandom', emoji: '🐺' },
    { value: 'Transformation', emoji: '🦋' },
    { value: 'Medical Play', emoji: '🩺' },
    { value: 'Food Play', emoji: '🍓' },
    { value: 'Wet & Messy', emoji: '⚫' },
    { value: 'Inflation', emoji: '🎈' },
    { value: 'Freezing', emoji: '🥶' },
    { value: 'Body Painting', emoji: '🎨' },
    { value: 'Cyborgs', emoji: '🤖' },
    { value: 'Monster/Non-human', emoji: '👾' },
    { value: 'Smoking Fetish', emoji: '🚬' },
    { value: 'Asphyxiation', emoji: '😮‍💨' },
    { value: 'Sperm Thief Fantasy', emoji: '🧬' },
    { value: 'Somnophilia', emoji: '😴' },
    { value: 'Abduction Fantasy', emoji: '😨' },
  ],
};

const detailsPickerTitles: Record<DetailsPickerType, string> = {
  voice: 'Select Voice',
  personality: 'Select Personality',
  occupation: 'Select Occupation',
  relationship: 'Select Relationship',
  hobby: 'Select Hobby',
  fetish: 'Select Fetish',
};

type VoicePresetId =
  | 'honey'
  | 'aurora'
  | 'asmr'
  | 'hottie'
  | 'joi'
  | 'sorority'
  | 'posh'
  | 'smooth'
  | 'adventurer'
  | 'conspiracist'
  | 'casual'
  | 'coach'
  | 'formal'
  | 'quirky'
  | 'nerdy'
  | 'adorable';

const VOICE_PRESETS: ReadonlyArray<{ value: VoicePresetId; label: string; sampleText: string }> = [
  { value: 'honey', label: 'Honey', sampleText: "Hey, I'm Honey. Want to chat?" },
  { value: 'aurora', label: 'Aurora', sampleText: "Hello, I'm Aurora. Let's begin." },
  { value: 'asmr', label: 'ASMR', sampleText: "Hi… I'm ASMR. I'm right here." },
  { value: 'hottie', label: 'Hottie', sampleText: "Hey babe. I'm your Hottie." },
  { value: 'joi', label: 'JOI', sampleText: "I'm JOI. Listen closely." },
  { value: 'sorority', label: 'Sorority', sampleText: "Hi! I'm Sorority. Let's have fun." },
  { value: 'posh', label: 'Posh', sampleText: "Good day. I'm Posh." },
  { value: 'smooth', label: 'Smooth', sampleText: "Hey. I'm Smooth. Nice and easy." },
  { value: 'adventurer', label: 'Adventurer', sampleText: "I'm Adventurer. Ready to explore?" },
  { value: 'conspiracist', label: 'Conspiracist', sampleText: "I'm Conspiracist. I've got theories." },
  { value: 'casual', label: 'Casual', sampleText: "Yo, I'm Casual. What's up?" },
  { value: 'coach', label: 'Coach', sampleText: "I'm Coach. Let's do this together." },
  { value: 'formal', label: 'Formal', sampleText: "Hello. I'm Formal. How may I help?" },
  { value: 'quirky', label: 'Quirky', sampleText: "Hi! I'm Quirky. This is exciting!" },
  { value: 'nerdy', label: 'Nerdy', sampleText: "Hey. I'm Nerdy. Let's talk details." },
  { value: 'adorable', label: 'Adorable', sampleText: "Hi! I'm Adorable. Nice to meet you!" },
];

function playPlaceholderVoice(text: string) {
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function loadInitialState(): PartnerFlowState {
  // State persistence for the multi-step wizard: selections must survive refresh/navigation.
  if (typeof window === 'undefined') {
    return {
      progressStep: 0,
      viewStep: 0,
      style: null,
      gender: 'female',
      ethnicity: null,
      skinTone: null,
      age: 20,
      eyeColor: null,
      hairColor: null,
      hairStyle: null,
      bodyType: null,
      breastSize: null,
      buttSize: null,
      characterName: '',
      voice: null,
      personality: null,
      occupation: null,
      relationship: null,
      hobby: null,
      fetish: null,
      characterDescription: '',
      firstMessage: '',
      systemPrompt: '',
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        progressStep: 0,
        viewStep: 0,
        style: null,
        gender: 'female',
        ethnicity: null,
        skinTone: null,
        age: 20,
        eyeColor: null,
        hairColor: null,
        hairStyle: null,
        bodyType: null,
        breastSize: null,
        buttSize: null,
        characterName: '',
        voice: null,
        personality: null,
        occupation: null,
        relationship: null,
        hobby: null,
        fetish: null,
        characterDescription: '',
        firstMessage: '',
        systemPrompt: '',
      };
    }

    // Support older saved payloads that used a single `step` field.
    const parsed = JSON.parse(raw) as Partial<PartnerFlowState> & { step?: number };
    const progressStep = typeof parsed.progressStep === 'number'
      ? parsed.progressStep
      : (typeof parsed.step === 'number' ? parsed.step : 0);
    const clampedProgressStep = Math.max(0, Math.min(progressStep, MAX_IMPLEMENTED_STEP));

    return {
      progressStep: clampedProgressStep,
      // Always open the flow on the Style screen; users can still navigate via the progress bar/back.
      viewStep: 0,
      style: parsed.style ?? null,
      gender: parsed.gender ?? 'female',
      ethnicity: parsed.ethnicity ?? null,
      skinTone: parsed.skinTone ?? null,
      age: typeof parsed.age === 'number' ? parsed.age : 20,
      eyeColor: parsed.eyeColor ?? null,
      hairColor: parsed.hairColor ?? null,
      hairStyle: parsed.hairStyle ?? null,
      bodyType: parsed.bodyType ?? null,
      breastSize: parsed.breastSize ?? null,
      buttSize: parsed.buttSize ?? null,
      characterName: typeof parsed.characterName === 'string' ? parsed.characterName : '',
      voice: parsed.voice ?? null,
      personality: parsed.personality ?? null,
      occupation: parsed.occupation ?? null,
      relationship: parsed.relationship ?? null,
      hobby: parsed.hobby ?? null,
      fetish: parsed.fetish ?? null,
      characterDescription: typeof parsed.characterDescription === 'string' ? parsed.characterDescription : '',
      firstMessage: typeof parsed.firstMessage === 'string' ? parsed.firstMessage : '',
      systemPrompt: typeof parsed.systemPrompt === 'string' ? parsed.systemPrompt : '',
    };
  } catch {
    return {
      progressStep: 0,
      viewStep: 0,
      style: null,
      gender: 'female',
      ethnicity: null,
      skinTone: null,
      age: 20,
      eyeColor: null,
      hairColor: null,
      hairStyle: null,
      bodyType: null,
      breastSize: null,
      buttSize: null,
      characterName: '',
      voice: null,
      personality: null,
      occupation: null,
      relationship: null,
      hobby: null,
      fetish: null,
      characterDescription: '',
      firstMessage: '',
      systemPrompt: '',
    };
  }
}

export default function CreateYourOwnAICharacterPage() {
  const [{
    progressStep,
    viewStep,
    style,
    gender,
    ethnicity,
    skinTone,
    age,
    eyeColor,
    hairColor,
    hairStyle,
    bodyType,
    breastSize,
    buttSize,
    characterName,
    voice,
    personality,
    occupation,
    relationship,
    hobby,
    fetish,
    characterDescription,
    firstMessage,
    systemPrompt,
  }, setFlowState] = useState<PartnerFlowState>(() => loadInitialState());
  const ageRangeRef = useRef<HTMLInputElement | null>(null);
  const [hoverAge, setHoverAge] = useState<number | null>(null);
  const [hoverAgePercent, setHoverAgePercent] = useState<number>(0);
  const [activeDetailsPicker, setActiveDetailsPicker] = useState<DetailsPickerType | null>(null);
  const [detailsSearchQuery, setDetailsSearchQuery] = useState<string>('');
  const deferredDetailsSearchQuery = useDeferredValue(detailsSearchQuery);
  const [advancedDetailsOpen, setAdvancedDetailsOpen] = useState<boolean>(false);
  const [resultTab, setResultTab] = useState<'appearance' | 'personality'>('appearance');

  // Voice selector state (matches quick mode)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [customVoice, setCustomVoice] = useState<{ name: string; url: string; duration: number } | null>(null);
  const customVoiceInputRef = useRef<HTMLInputElement>(null);

  const handleVoicePresetPick = useCallback((preset: VoicePresetId) => {
    const label = VOICE_PRESETS.find((v) => v.value === preset)?.label ?? preset;
    setFlowState((prev) => ({ ...prev, voice: label }));
    setIsVoiceModalOpen(false);
  }, []);

  const handlePlayVoiceSample = useCallback((preset: VoicePresetId) => {
    const option = VOICE_PRESETS.find((v) => v.value === preset);
    if (option) playPlaceholderVoice(option.sampleText);
  }, []);

  const handleCustomVoiceUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/')) return;
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = url;
    audio.addEventListener('loadedmetadata', () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setCustomVoice({ name: file.name, url, duration });
      setFlowState((prev) => ({ ...prev, voice: `Custom: ${file.name}` }));
      setIsVoiceModalOpen(false);
    });
    audio.addEventListener('error', () => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    return () => {
      if (customVoice?.url) URL.revokeObjectURL(customVoice.url);
    };
  }, [customVoice?.url]);

  useEffect(() => {
    if (!isVoiceModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsVoiceModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVoiceModalOpen]);

  // Debounced localStorage persistence — avoids blocking UI on every keystroke
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          progressStep,
          viewStep,
          style,
          gender,
          ethnicity,
          skinTone,
          age,
          eyeColor,
          hairColor,
          hairStyle,
          bodyType,
          breastSize,
          buttSize,
          characterName,
          voice,
          personality,
          occupation,
          relationship,
          hobby,
          fetish,
          characterDescription,
          firstMessage,
          systemPrompt,
        })
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [
    progressStep,
    viewStep,
    style,
    gender,
    ethnicity,
    skinTone,
    age,
    eyeColor,
    hairColor,
    hairStyle,
    bodyType,
    breastSize,
    buttSize,
    characterName,
    voice,
    personality,
    occupation,
    relationship,
    hobby,
    fetish,
    characterDescription,
    firstMessage,
    systemPrompt,
  ]);

  useEffect(() => {
    if (!activeDetailsPicker) return;

    // Modal UX: close on Escape and prevent background scroll while the modal is open.
    setDetailsSearchQuery('');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveDetailsPicker(null);
    };
    window.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeDetailsPicker]);

  const progressActiveIndex = Math.max(0, Math.min(progressStep, steps.length - 1));
  // The progress bar "current" state must reflect what the user is actively editing.
  const currentViewStep = Math.max(0, Math.min(viewStep, progressActiveIndex));
  const progressFillPercent = useMemo(() => {
    // Progress fill represents completed steps only (active step stays unfilled).
    return (progressActiveIndex / (steps.length - 1)) * 100;
  }, [progressActiveIndex]);

  const canCompleteStyle = useMemo(() => {
    // Gender is always selected (defaulted), but style must be chosen before completing the step.
    return Boolean(style);
  }, [style]);

  const canCompleteGeneral = useMemo(() => {
    // General is considered complete when the user has chosen ethnicity + skin tone.
    return Boolean(ethnicity) && Boolean(skinTone);
  }, [ethnicity, skinTone]);

  const canCompleteFace = useMemo(() => {
    return Boolean(eyeColor) && Boolean(hairColor) && Boolean(hairStyle);
  }, [eyeColor, hairColor, hairStyle]);

  const canCompleteBody = useMemo(() => {
    return Boolean(bodyType) && Boolean(breastSize) && Boolean(buttSize);
  }, [bodyType, breastSize, buttSize]);

  const canCompleteDetails = useMemo(() => {
    return (
      characterName.trim().length > 0 &&
      Boolean(voice) &&
      Boolean(personality) &&
      Boolean(occupation) &&
      Boolean(relationship)
    );
  }, [characterName, voice, personality, occupation, relationship]);

  const handleStyleSelect = (option: StyleOption) => {
    setFlowState(prev => ({ ...prev, style: option }));
  };

  const handleGenderSelect = (option: GenderOption) => {
    setFlowState(prev => ({ ...prev, gender: option }));
  };

  const handleEthnicitySelect = (option: EthnicityOption) => {
    setFlowState(prev => ({ ...prev, ethnicity: option }));
  };

  const handleSkinToneSelect = (option: SkinToneOption) => {
    setFlowState(prev => ({ ...prev, skinTone: option }));
  };

  const handleEyeColorSelect = (option: EyeColorOption) => {
    setFlowState(prev => ({ ...prev, eyeColor: option }));
  };

  const handleHairColorSelect = (option: HairColorOption) => {
    setFlowState(prev => ({ ...prev, hairColor: option }));
  };

  const handleHairStyleSelect = (option: HairStyleOption) => {
    setFlowState(prev => ({ ...prev, hairStyle: option }));
  };

  const handleBodyTypeSelect = (option: BodyTypeOption) => {
    setFlowState(prev => ({ ...prev, bodyType: option }));
  };

  const handleBreastSizeSelect = (option: BreastSizeOption) => {
    setFlowState(prev => ({ ...prev, breastSize: option }));
  };

  const handleButtSizeSelect = (option: ButtSizeOption) => {
    setFlowState(prev => ({ ...prev, buttSize: option }));
  };

  const handleCharacterNameChange = (value: string) => {
    setFlowState(prev => ({ ...prev, characterName: value }));
  };

  const handleDetailsValueSelect = (picker: DetailsPickerType, value: string) => {
    setFlowState(prev => {
      switch (picker) {
        case 'voice':
          return { ...prev, voice: value };
        case 'personality':
          return { ...prev, personality: value };
        case 'occupation':
          return { ...prev, occupation: value };
        case 'relationship':
          return { ...prev, relationship: value };
        case 'hobby':
          return { ...prev, hobby: value };
        case 'fetish':
          return { ...prev, fetish: value };
        default:
          return prev;
      }
    });
    setActiveDetailsPicker(null);
  };

  const activeDetailsOptions = useMemo(() => {
    if (!activeDetailsPicker) return [];

    const options = detailsOptions[activeDetailsPicker];
    if (activeDetailsPicker !== 'hobby' && activeDetailsPicker !== 'fetish') return options;

    const query = deferredDetailsSearchQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.value.toLowerCase().includes(query));
  }, [activeDetailsPicker, deferredDetailsSearchQuery]);

  const handleAdvancedDetailsChange = (
    field: 'characterDescription' | 'firstMessage' | 'systemPrompt',
    value: string
  ) => {
    setFlowState(prev => {
      switch (field) {
        case 'characterDescription':
          return { ...prev, characterDescription: value };
        case 'firstMessage':
          return { ...prev, firstMessage: value };
        case 'systemPrompt':
          return { ...prev, systemPrompt: value };
        default:
          return prev;
      }
    });
  };

  const handleNext = () => {
    // Guard: only mark a step "completed" once required selections are made and user clicks Next.
    setFlowState(prev => {
      if (prev.viewStep === 0 && !prev.style) return prev;
      if (prev.viewStep === 1 && (!prev.ethnicity || !prev.skinTone)) return prev;
      if (prev.viewStep === 2 && (!prev.eyeColor || !prev.hairColor || !prev.hairStyle)) return prev;
      if (prev.viewStep === 3 && (!prev.bodyType || !prev.breastSize || !prev.buttSize)) return prev;
      if (prev.viewStep === 4 && (
        prev.characterName.trim().length === 0 ||
        !prev.voice ||
        !prev.personality ||
        !prev.occupation ||
        !prev.relationship
      )) return prev;
      if (prev.viewStep >= MAX_IMPLEMENTED_STEP) return prev;

      // If the user is reviewing a previous step, "Next" navigates forward without changing progress.
      if (prev.viewStep < prev.progressStep) {
        return { ...prev, viewStep: prev.viewStep + 1 };
      }
      return {
        ...prev,
        progressStep: Math.min(prev.progressStep + 1, MAX_IMPLEMENTED_STEP),
        viewStep: Math.min(prev.progressStep + 1, MAX_IMPLEMENTED_STEP),
      };
    });
  };

  const handleBringToLife = () => {
    // TODO: Wire this to the real backend/API (generate image + create partner) using the saved selections.
  };

  const jumpToAdvancedDetailsField = (fieldId: 'character-description' | 'first-message' | 'system-prompt') => {
    // Result step edit affordances should route users back to Details -> Advanced Details and focus the field.
    setFlowState(prev => ({
      ...prev,
      viewStep: Math.min(4, prev.progressStep),
    }));
    setAdvancedDetailsOpen(true);
    requestAnimationFrame(() => {
      const element = document.getElementById(fieldId) as HTMLTextAreaElement | null;
      if (!element) return;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    });
  };

  const handleBack = () => {
    setFlowState(prev => ({ ...prev, viewStep: Math.max(0, prev.viewStep - 1) }));
  };

  const handleStepJump = (targetIndex: number) => {
    // Navigation via the progress bar must not change completion/progress state.
    setFlowState(prev => ({
      ...prev,
      viewStep: Math.max(0, Math.min(targetIndex, prev.progressStep)),
    }));
  };

  const agePercent = useMemo(() => {
    const min = 18;
    const max = 55;
    const clamped = Math.max(min, Math.min(age, max));
    return ((clamped - min) / (max - min)) * 100;
  }, [age]);

  const handleAgeChange = (value: number) => {
    setFlowState(prev => ({ ...prev, age: value }));
  };

  const handleAgeHover = (clientX: number) => {
    const input = ageRangeRef.current;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    const min = Number(input.min) || 18;
    const max = Number(input.max) || 55;

    const raw = (clientX - rect.left) / rect.width;
    const percent = Math.max(0, Math.min(raw, 1));
    const value = Math.round(min + percent * (max - min));

    setHoverAge(value);
    setHoverAgePercent(percent * 100);
  };

  return (
    <div className={styles.page}>
      <header className={styles.brandbar}>
        <Link href="/" className={styles.brandLink}>
          <span className={styles.logo}>V</span>
          <span className={styles.brandName}>Veloura.ai</span>
        </Link>
      </header>

      <main className={styles.container}>
        <div className={styles.heading}>
          <h1>
            <span className={styles.accent}>Create</span> your own AI girlfriend &amp; custom character
          </h1>
        </div>

        <div
          className={styles.wizard}
          style={{ ['--progress' as never]: `${progressFillPercent}%` }}
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            // State precedence: current (white) overrides completed (pink).
            const isCurrent = index === currentViewStep;
            const isCompleted = !isCurrent && index < progressActiveIndex;
            const isEnabled = index <= progressActiveIndex;
            return (
              <button
                key={step.id}
                type="button"
                disabled={!isEnabled}
                className={cn(styles.step, isCurrent && styles.stepActive, isCompleted && styles.stepCompleted)}
                onClick={() => handleStepJump(index)}
              >
                <div className={styles.dot} aria-hidden>
                  <Icon size={18} />
                </div>
                <div className={styles.label}>{step.label}</div>
              </button>
            );
          })}
        </div>

        {currentViewStep === 0 && (
          <div className={styles.genderTabs} role="tablist" aria-label="Gender selection">
            {genderOptions.map((option) => {
              const Icon = option.icon;
              const active = gender === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={cn(styles.genderTab, active && styles.genderTabActive)}
                  onClick={() => handleGenderSelect(option.id)}
                >
                  <Icon size={16} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {currentViewStep === 0 ? (
          <section className={styles.styleGrid} aria-label="Style selection">
            {styleOptions.map((option) => {
              const isSelected = style === option.id;
              const mediaClass =
                option.id === 'realistic'
                  ? styles.mediaRealistic
                  : option.id === 'anime'
                    ? styles.mediaAnime
                    : option.id === 'furry'
                      ? styles.mediaFurry
                      : styles.mediaFantasy;

              return (
                <button
                  key={option.id}
                  type="button"
                  className={cn(styles.styleCard, isSelected && styles.styleCardSelected)}
                  onClick={() => handleStyleSelect(option.id)}
                >
                  <div className={cn(styles.cardMedia, mediaClass)}>
                    <div className={styles.cardOverlay} />
                  </div>
                  <div className={styles.cardPill}>{option.label}</div>
                </button>
              );
            })}
          </section>
        ) : currentViewStep === 1 ? (
          <section className={styles.general} aria-label="General settings">
            <h2 className={styles.sectionTitle}>Ethnicity</h2>
            <div className={styles.ethnicityGrid}>
              {ethnicityOptions.map((option) => {
                const isSelected = ethnicity === option.id;
                return (
                  <button
                    key={option.id}
                    className={cn(
                      styles.ethnicityCard,
                      isSelected && styles.ethnicityCardSelected
                    )}
                    onClick={() => handleEthnicitySelect(option.id)}
                  >
                    {option.premium && <div className={styles.premiumRibbon}>PREMIUM</div>}
                    {isSelected && <div className={styles.checkmark} aria-hidden>✓</div>}
                    <div className={styles.ethnicityMedia} />
                    <div className={styles.ethnicityLabel}>{option.label}</div>
                  </button>
                );
              })}
            </div>

            <div className={styles.ageCard} style={{ ['--age-progress' as never]: `${agePercent}%` }}>
              <h2 className={styles.ageTitle}>Character Age</h2>
              <div className={styles.ageSlider}>
                <div className={styles.ageValue} aria-hidden>
                  {age}
                </div>
                {/* Hover tooltip: shows the age at the cursor position on the track (does not change selection). */}
                {hoverAge !== null && (
                  <div
                    className={styles.ageHoverValue}
                    style={{ ['--hover-progress' as never]: `${hoverAgePercent}%` }}
                    aria-hidden
                  >
                    {hoverAge}
                  </div>
                )}
                <div className={styles.ageTrackRow}>
                  <span className={styles.ageEdge}>18+</span>
                  <input
                    type="range"
                    min={18}
                    max={55}
                    value={age}
                    onChange={(e) => handleAgeChange(Number(e.target.value))}
                    className={styles.ageRange}
                    aria-label="Character age"
                    ref={ageRangeRef}
                    onMouseEnter={(e) => handleAgeHover(e.clientX)}
                    onMouseMove={(e) => handleAgeHover(e.clientX)}
                    onMouseLeave={() => setHoverAge(null)}
                  />
                  <span className={styles.ageEdge}>55+</span>
                </div>
              </div>
            </div>

            <h2 className={styles.sectionTitle}>Skin Tone</h2>
            <div className={styles.skinRow} role="list" aria-label="Skin tone selection">
              {skinTones.map((tone) => {
                const isSelected = skinTone === tone.id;
                return (
                  <button
                    key={tone.id}
                    className={cn(styles.skinSwatch, isSelected && styles.skinSwatchSelected)}
                    style={{ backgroundColor: tone.color }}
                    onClick={() => handleSkinToneSelect(tone.id)}
                    role="listitem"
                    aria-label={tone.label}
                  >
                    {isSelected && <span className={styles.skinSwatchLabel}>{tone.id === 'olive' ? 'Olive' : tone.label}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ) : currentViewStep === 2 ? (
          <section className={styles.face} aria-label="Face settings">
            <h2 className={styles.sectionTitle}>Hair color</h2>
            <div className={styles.pillRow} role="list" aria-label="Hair color selection">
              {hairColors.map((option) => {
                const isSelected = hairColor === option.id;
                return (
                <button
                  key={option.id}
                  type="button"
                  role="listitem"
                  aria-label={option.label}
                  className={cn(styles.pill, isSelected && styles.pillSelected)}
                  style={{ background: option.background }}
                  onClick={() => handleHairColorSelect(option.id)}
                />
              );
            })}
          </div>

            <h2 className={styles.sectionTitle}>Eye color</h2>
            <div className={styles.pillRow} role="list" aria-label="Eye color selection">
              {eyeColors.map((option) => {
                const isSelected = eyeColor === option.id;
                return (
                <button
                  key={option.id}
                  type="button"
                  role="listitem"
                  aria-label={option.label}
                  className={cn(styles.pill, styles.eyePill, isSelected && styles.pillSelected)}
                  style={{ background: option.background }}
                  onClick={() => handleEyeColorSelect(option.id)}
                />
              );
            })}
          </div>

            <h2 className={styles.sectionTitle}>Hair type</h2>
            <div className={styles.hairGrid} aria-label="Hair style selection">
              {hairStyles.map((option) => {
                const isSelected = hairStyle === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(styles.hairCard, isSelected && styles.hairCardSelected)}
                    onClick={() => handleHairStyleSelect(option.id)}
                    aria-label={option.label}
                  >
                    {isSelected && <div className={styles.checkmark} aria-hidden>✓</div>}
                    <div className={styles.hairMedia} />
                    <div className={styles.hairLabel}>{option.label}</div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : currentViewStep === 3 ? (
          <section className={styles.body} aria-label="Body settings">
            <h2 className={styles.sectionTitle}>Body type</h2>
            <div className={styles.optionGrid} style={{ ['--cols' as never]: 4 }}>
              {bodyTypes.map((option) => {
                const isSelected = bodyType === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(styles.hairCard, isSelected && styles.hairCardSelected)}
                    onClick={() => handleBodyTypeSelect(option.id)}
                    aria-label={option.label}
                  >
                    {isSelected && <div className={styles.checkmark} aria-hidden>✓</div>}
                    <div className={styles.hairMedia} />
                    <div className={styles.hairLabel}>{option.label}</div>
                  </button>
                );
              })}
            </div>

            <h2 className={styles.sectionTitle}>Breast size</h2>
            <div className={styles.optionGrid} style={{ ['--cols' as never]: 5 }}>
              {breastSizes.map((option) => {
                const isSelected = breastSize === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(styles.hairCard, isSelected && styles.hairCardSelected)}
                    onClick={() => handleBreastSizeSelect(option.id)}
                    aria-label={option.label}
                  >
                    {isSelected && <div className={styles.checkmark} aria-hidden>✓</div>}
                    <div className={styles.hairMedia} />
                    <div className={styles.hairLabel}>{option.label}</div>
                  </button>
                );
              })}
            </div>

            <h2 className={styles.sectionTitle}>Butt size</h2>
            <div className={styles.optionGrid} style={{ ['--cols' as never]: 4 }}>
              {buttSizes.map((option) => {
                const isSelected = buttSize === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(styles.hairCard, isSelected && styles.hairCardSelected)}
                    onClick={() => handleButtSizeSelect(option.id)}
                    aria-label={option.label}
                  >
                    {isSelected && <div className={styles.checkmark} aria-hidden>✓</div>}
                    <div className={styles.hairMedia} />
                    <div className={styles.hairLabel}>{option.label}</div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : currentViewStep === 4 ? (
          <section className={styles.details} aria-label="Details settings">
            <h2 className={styles.sectionTitle}>Character Name</h2>
            <input
              type="text"
              value={characterName}
              onChange={(e) => handleCharacterNameChange(e.target.value)}
              placeholder="Enter a character name"
              className={styles.nameInput}
              aria-label="Character name"
              autoComplete="off"
              inputMode="text"
            />

            <div className={styles.detailsHeading}>
              <h2 className={styles.sectionTitle}>Personality Details</h2>
              <div className={styles.detailsSubtitle}>(click to change)</div>
            </div>

            <div className={styles.detailsGrid} aria-label="Personality detail selections">
              <button
                type="button"
                className={styles.detailsTile}
                onClick={() => setIsVoiceModalOpen(true)}
              >
                <div className={styles.detailsTileText}>
                  <div className={styles.detailsTileLabel}>Voice</div>
                  <div className={styles.detailsTileValue}>{voice ?? 'Not set'}</div>
                </div>
                <div className={cn(styles.detailsTileIcon, styles.detailsTileIconPrimary)} aria-hidden>
                  <Play size={18} />
                </div>
              </button>

              <button
                type="button"
                className={styles.detailsTile}
                onClick={() => setActiveDetailsPicker('personality')}
              >
                <div className={styles.detailsTileText}>
                  <div className={styles.detailsTileLabel}>Personality</div>
                  <div className={styles.detailsTileValue}>{personality ?? 'Not set'}</div>
                </div>
                <div className={styles.detailsTileIcon} aria-hidden>🔥</div>
              </button>

              <button
                type="button"
                className={styles.detailsTile}
                onClick={() => setActiveDetailsPicker('occupation')}
              >
                <div className={styles.detailsTileText}>
                  <div className={styles.detailsTileLabel}>Occupation</div>
                  <div className={styles.detailsTileValue}>{occupation ?? 'Not set'}</div>
                </div>
                <div className={styles.detailsTileIcon} aria-hidden>🔥</div>
              </button>

              <button
                type="button"
                className={styles.detailsTile}
                onClick={() => setActiveDetailsPicker('relationship')}
              >
                <div className={styles.detailsTileText}>
                  <div className={styles.detailsTileLabel}>Relationship</div>
                  <div className={styles.detailsTileValue}>{relationship ?? 'Not set'}</div>
                </div>
                <div className={styles.detailsTileIcon} aria-hidden>👬</div>
              </button>

              <button
                type="button"
                className={styles.detailsTile}
                onClick={() => setActiveDetailsPicker('hobby')}
              >
                <div className={styles.detailsTileText}>
                  <div className={styles.detailsTileLabel}>Hobby</div>
                  <div className={styles.detailsTileValue}>{hobby ?? 'Not set'}</div>
                </div>
              </button>

              <button
                type="button"
                className={styles.detailsTile}
                onClick={() => setActiveDetailsPicker('fetish')}
              >
                <div className={styles.detailsTileText}>
                  <div className={styles.detailsTileLabel}>Fetish</div>
                  <div className={styles.detailsTileValue}>{fetish ?? 'Not set'}</div>
                </div>
              </button>
            </div>

            <button
              type="button"
              className={styles.advancedCard}
              onClick={() => setAdvancedDetailsOpen((open) => !open)}
              aria-expanded={advancedDetailsOpen}
              aria-controls="advanced-details-panel"
            >
              <span className={styles.advancedLabel}>Advanced Details</span>
              <span
                className={cn(styles.advancedChevron, advancedDetailsOpen && styles.advancedChevronOpen)}
                aria-hidden
              >
                ▾
              </span>
            </button>

            <div
              id="advanced-details-panel"
              className={cn(styles.advancedPanel, advancedDetailsOpen && styles.advancedPanelOpen)}
              role="region"
              aria-label="Advanced details"
            >
              <div className={styles.advancedField}>
                <label className={styles.advancedFieldLabel} htmlFor="character-description">
                  Character Description
                </label>
                <textarea
                  id="character-description"
                  className={styles.advancedTextarea}
                  value={characterDescription}
                  onChange={(e) => handleAdvancedDetailsChange('characterDescription', e.target.value)}
                  placeholder="Describe the character’s personality, tone, and role in conversations."
                  rows={4}
                />
              </div>

              <div className={styles.advancedField}>
                <label className={styles.advancedFieldLabel} htmlFor="first-message">
                  First message
                </label>
                <textarea
                  id="first-message"
                  className={styles.advancedTextarea}
                  value={firstMessage}
                  onChange={(e) => handleAdvancedDetailsChange('firstMessage', e.target.value)}
                  placeholder="The first message the AI sends when the user opens the chat."
                  rows={4}
                />
              </div>

              <div className={styles.advancedField}>
                <label className={styles.advancedFieldLabel} htmlFor="system-prompt">
                  System prompt
                </label>
                <textarea
                  id="system-prompt"
                  className={styles.advancedTextarea}
                  value={systemPrompt}
                  onChange={(e) => handleAdvancedDetailsChange('systemPrompt', e.target.value)}
                  placeholder="Set the AI’s role, tone, and behavior. These instructions guide how the AI responds to your msg."
                  rows={5}
                />
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.result} aria-label="Result summary">
            <div className={styles.resultLayout}>
              <div className={styles.resultLeft}>
                <div className={styles.resultPreview}>
                  <div
                    className={cn(
                      styles.resultPreviewMedia,
                      style === 'realistic'
                        ? styles.mediaRealistic
                        : style === 'anime'
                          ? styles.mediaAnime
                          : style === 'furry'
                            ? styles.mediaFurry
                            : styles.mediaFantasy
                    )}
                    aria-hidden
                  />
                  <div className={styles.resultPreviewOverlay} aria-hidden />

                  <div className={styles.resultPreviewBadges} aria-label="Selected style">
                    <span className={styles.resultPreviewBadge}>
                      {genderOptions.find((o) => o.id === gender)?.label ?? 'null'}
                    </span>
                    <span className={styles.resultPreviewBadge}>
                      {styleOptions.find((o) => o.id === style)?.label ?? 'null'}
                    </span>
                    <span className={styles.resultPreviewBadge}>
                      {skinTones.find((o) => o.id === skinTone)?.label ?? 'null'}
                    </span>
                  </div>

                  <button type="button" className={styles.resultPreviewRefresh} aria-label="Refresh preview">
                    <RefreshCcw size={18} />
                  </button>
                  <button type="button" className={styles.resultPreviewEdit} aria-label="Edit details">
                    <PencilLine size={18} />
                  </button>

                  <div className={styles.resultPreviewFooter}>
                    <div className={styles.resultPreviewNameRow}>
                      <div className={styles.resultPreviewName}>{characterName}</div>
                      <div className={styles.resultPreviewAge}>{age}</div>
                    </div>
                    <div className={styles.resultPreviewDescription}>
                      {characterDescription.trim().length > 0 ? characterDescription : 'null'}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.resultRight}>
                <div className={styles.resultTabs} role="tablist" aria-label="Result tabs">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={resultTab === 'appearance'}
                    className={cn(styles.resultTab, resultTab === 'appearance' && styles.resultTabActive)}
                    onClick={() => setResultTab('appearance')}
                  >
                    Appearance
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={resultTab === 'personality'}
                    className={cn(styles.resultTab, resultTab === 'personality' && styles.resultTabActive)}
                    onClick={() => setResultTab('personality')}
                  >
                    Personality
                  </button>
                </div>

                {resultTab === 'appearance' ? (
                  <div className={cn(styles.resultGrid, styles.resultGridAppearance)} aria-label="Appearance summary">
                    <div className={cn(styles.resultCard, styles.resultCardWide)}>
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>Voice</div>
                        <div className={styles.resultCardValue}>{voice ?? 'null'}</div>
                      </div>
                      <div className={styles.resultPlay} aria-hidden>
                        <Play size={18} />
                      </div>
                    </div>

                    <div className={cn(styles.resultCard, styles.resultCardMedia)}>
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>Hair Style</div>
                        <div className={styles.resultCardValue}>{hairStyles.find((o) => o.id === hairStyle)?.label ?? 'null'}</div>
                      </div>
                      <div className={cn(styles.resultCardMediaBackdrop, styles.hairMedia)} aria-hidden />
                      <div className={styles.resultCardMediaOverlay} aria-hidden />
                    </div>

                    <div className={cn(styles.resultCard, styles.resultCardMedia)}>
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>Body Type</div>
                        <div className={styles.resultCardValue}>{bodyTypes.find((o) => o.id === bodyType)?.label ?? 'null'}</div>
                      </div>
                      <div className={cn(styles.resultCardMediaBackdrop, styles.hairMedia)} aria-hidden />
                      <div className={styles.resultCardMediaOverlay} aria-hidden />
                    </div>

                    <div className={cn(styles.resultCard, styles.resultCardMedia)}>
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>Ethnicity</div>
                        <div className={styles.resultCardValue}>{ethnicityOptions.find((o) => o.id === ethnicity)?.label ?? 'null'}</div>
                      </div>
                      <div className={cn(styles.resultCardMediaBackdrop, styles.ethnicityMedia)} aria-hidden />
                      <div className={styles.resultCardMediaOverlay} aria-hidden />
                    </div>

                    <div className={cn(styles.resultCard, styles.resultCardMedia)}>
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>Breast Size</div>
                        <div className={styles.resultCardValue}>{breastSizes.find((o) => o.id === breastSize)?.label ?? 'null'}</div>
                      </div>
                      <div className={cn(styles.resultCardMediaBackdrop, styles.hairMedia)} aria-hidden />
                      <div className={styles.resultCardMediaOverlay} aria-hidden />
                    </div>

                    <div className={cn(styles.resultCard, styles.resultCardMedia)}>
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>Butt Size</div>
                        <div className={styles.resultCardValue}>{buttSizes.find((o) => o.id === buttSize)?.label ?? 'null'}</div>
                      </div>
                      <div className={cn(styles.resultCardMediaBackdrop, styles.hairMedia)} aria-hidden />
                      <div className={styles.resultCardMediaOverlay} aria-hidden />
                    </div>

                    <div
                      className={cn(styles.resultCard, styles.resultCardMedia)}
                      style={{ background: hairColors.find((o) => o.id === hairColor)?.background }}
                    >
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>Hair Color</div>
                        <div className={styles.resultCardValue}>{hairColors.find((o) => o.id === hairColor)?.label ?? 'null'}</div>
                      </div>
                      <div className={styles.resultCardMediaOverlay} aria-hidden />
                    </div>

                    <div
                      className={cn(styles.resultCard, styles.resultCardMedia)}
                      style={{ background: eyeColors.find((o) => o.id === eyeColor)?.background }}
                    >
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>Eye Color</div>
                        <div className={styles.resultCardValue}>{eyeColors.find((o) => o.id === eyeColor)?.label ?? 'null'}</div>
                      </div>
                      <div className={styles.resultCardMediaOverlay} aria-hidden />
                    </div>
                  </div>
                ) : (
                  <div className={styles.resultGrid} aria-label="Personality summary">
                    <div className={cn(styles.resultCard, styles.resultCardWide)}>
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>Personality</div>
                        <div className={styles.resultCardValue}>{personality ?? 'null'}</div>
                      </div>
                      <div className={styles.resultCardIcon} aria-hidden>🔥</div>
                    </div>

                    <div className={styles.resultCard}>
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>Occupation</div>
                        <div className={styles.resultCardValue}>{occupation ?? 'null'}</div>
                      </div>
                      <div className={styles.resultCardIcon} aria-hidden>📱</div>
                    </div>

                    <div className={styles.resultCard}>
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>Relationship</div>
                        <div className={styles.resultCardValue}>{relationship ?? 'null'}</div>
                      </div>
                      <div className={styles.resultCardIcon} aria-hidden>👬</div>
                    </div>

                    <div className={styles.resultCard}>
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>Hobby</div>
                        <div className={styles.resultCardValue}>{hobby ?? 'null'}</div>
                      </div>
                    </div>

                    <div className={styles.resultCard}>
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>Fetish</div>
                        <div className={styles.resultCardValue}>{fetish ?? 'null'}</div>
                      </div>
                    </div>

                    <div className={cn(styles.resultCard, styles.resultCardWide)}>
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>Character Description</div>
                        <div className={styles.resultCardLongValue}>
                          {characterDescription.trim().length > 0 ? characterDescription : 'null'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.resultEditIcon}
                        onClick={() => jumpToAdvancedDetailsField('character-description')}
                        aria-label="Edit Character Description"
                      >
                        <PencilLine size={18} />
                      </button>
                    </div>

                    <div className={cn(styles.resultCard, styles.resultCardWide)}>
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>First message</div>
                        <div className={styles.resultCardLongValue}>
                          {firstMessage.trim().length > 0 ? firstMessage : 'null'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.resultEditIcon}
                        onClick={() => jumpToAdvancedDetailsField('first-message')}
                        aria-label="Edit First message"
                      >
                        <PencilLine size={18} />
                      </button>
                    </div>

                    <div className={cn(styles.resultCard, styles.resultCardWide)}>
                      <div className={styles.resultCardText}>
                        <div className={styles.resultCardLabel}>System prompt</div>
                        <div className={styles.resultCardLongValue}>
                          {systemPrompt.trim().length > 0 ? systemPrompt : 'null'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.resultEditIcon}
                        onClick={() => jumpToAdvancedDetailsField('system-prompt')}
                        aria-label="Edit System prompt"
                      >
                        <PencilLine size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <footer className={styles.footer}>
          <div className={styles.actions}>
            {currentViewStep === 0 ? (
              <>
                <button className={styles.cta}>Create with AI</button>
                <button
                  className={cn(styles.cta, styles.ctaPrimary)}
                  onClick={handleNext}
                  disabled={!canCompleteStyle}
                >
                  Next Step
                </button>
                <button className={cn(styles.cta, styles.ctaPro)}>Auto-Generate with AI (Pro Mode)</button>
              </>
            ) : currentViewStep === 5 ? (
              <button
                type="button"
                className={cn(styles.cta, styles.ctaPrimary, styles.ctaFinal)}
                onClick={handleBringToLife}
              >
                <Sparkles size={18} aria-hidden />
                <span>Bring your AI to Life</span>
              </button>
            ) : (
              <>
                <button className={styles.cta} onClick={handleBack}>Back</button>
                <button
                  className={cn(styles.cta, styles.ctaPrimary)}
                  onClick={handleNext}
                  disabled={
                    currentViewStep === 1
                      ? !canCompleteGeneral
                      : currentViewStep === 2
                        ? !canCompleteFace
                        : currentViewStep === 3
                          ? !canCompleteBody
                          : !canCompleteDetails
                  }
                >
                  Next Step
                </button>
              </>
            )}
          </div>
        </footer>
      </main>

      {/* Voice selector modal (same UI as quick mode) */}
      {isVoiceModalOpen && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsVoiceModalOpen(false);
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Select Voice"
            style={{ maxWidth: '48rem' }}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Select Voice</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setIsVoiceModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <input
                ref={customVoiceInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCustomVoiceUpload(file);
                }}
              />

              {/* Custom voice upload card */}
              <button
                type="button"
                onClick={() => customVoiceInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  width: '100%',
                  padding: '1rem 1.25rem',
                  marginBottom: '1rem',
                  borderRadius: '1rem',
                  border: customVoice ? '1px solid rgba(236, 72, 153, 0.5)' : '1px dashed rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Upload custom voice</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.25rem' }}>
                    Click to upload an audio file
                    {customVoice && ` — Current: ${customVoice.name}`}
                  </div>
                </div>
                <Upload size={20} style={{ opacity: 0.5 }} />
              </button>

              {/* Preset voice grid */}
              <div className={styles.modalGrid} role="list">
                {VOICE_PRESETS.map((preset) => {
                  const selected = voice === preset.label;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      role="listitem"
                      className={cn(styles.modalOption, selected && styles.modalOptionSelected)}
                      onClick={() => handleVoicePresetPick(preset.value)}
                    >
                      <span className={styles.modalOptionLeft}>
                        <span className={styles.modalOptionValue}>{preset.label}</span>
                      </span>
                      <span
                        className={styles.modalPlay}
                        aria-hidden
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayVoiceSample(preset.value);
                        }}
                      >
                        <Play size={16} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeDetailsPicker && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveDetailsPicker(null);
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={detailsPickerTitles[activeDetailsPicker]}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{detailsPickerTitles[activeDetailsPicker]}</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setActiveDetailsPicker(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {(activeDetailsPicker === 'hobby' || activeDetailsPicker === 'fetish') && (
                <div className={styles.modalSearch}>
                  <Search size={18} aria-hidden />
                  <input
                    className={styles.modalSearchInput}
                    type="text"
                    value={detailsSearchQuery}
                    onChange={(e) => setDetailsSearchQuery(e.target.value)}
                    placeholder={activeDetailsPicker === 'hobby' ? 'Search hobbies' : 'Search fetishes'}
                    autoComplete="off"
                    aria-label={activeDetailsPicker === 'hobby' ? 'Search hobbies' : 'Search fetishes'}
                  />
                </div>
              )}
              <div className={styles.modalGrid} role="list">
                {activeDetailsOptions.map((option) => {
                  const selected =
                    (activeDetailsPicker === 'voice' && voice === option.value) ||
                    (activeDetailsPicker === 'personality' && personality === option.value) ||
                    (activeDetailsPicker === 'occupation' && occupation === option.value) ||
                    (activeDetailsPicker === 'relationship' && relationship === option.value) ||
                    (activeDetailsPicker === 'hobby' && hobby === option.value) ||
                    (activeDetailsPicker === 'fetish' && fetish === option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="listitem"
                      className={cn(styles.modalOption, selected && styles.modalOptionSelected)}
                      onClick={() => handleDetailsValueSelect(activeDetailsPicker, option.value)}
                    >
                      <span className={styles.modalOptionLeft}>
                        {activeDetailsPicker !== 'voice' && option.emoji && (
                          <span className={styles.modalEmoji} aria-hidden>
                            {option.emoji}
                          </span>
                        )}
                        <span className={styles.modalOptionValue}>
                          {option.value}
                          {activeDetailsPicker === 'voice' && option.premium && (
                            <span className={styles.modalPremium} aria-hidden>
                              💎
                            </span>
                          )}
                        </span>
                      </span>

                      {activeDetailsPicker === 'voice' && (
                        <span className={styles.modalPlay} aria-hidden>
                          <Play size={16} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <CharacterSeoBlock />
    </div>
  );
}
