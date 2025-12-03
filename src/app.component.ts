import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from './services/gemini.service';

interface CharacterStats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule]
})
export class AppComponent {
  private readonly geminiService = inject(GeminiService);

  // Form state signals
  characterName = signal('Valerius');
  characterRace = signal('Human');
  characterClass = signal('Paladin');
  specialElements = signal('Glowing golden eyes, ornate silver armor');
  includeRandomTraits = signal(false);

  // App state signals
  isLoading = signal(false);
  error = signal<string | null>(null);
  generatedImage = signal<string | null>(null);
  characterStats = signal<CharacterStats | null>(null);
  characterTraits = signal<string[] | null>(null);

  // Loading progress
  loadingProgress = signal(0);
  private loadingMessages = [
    'Gathering arcane energies...',
    'Consulting ancient scrolls...',
    'Shaping the hero\'s form...',
    'Inscribing the final runes...',
    'A legend is born!'
  ];
  loadingMessage = computed(() => {
    const progress = this.loadingProgress();
    if (progress < 25) return this.loadingMessages[0];
    if (progress < 50) return this.loadingMessages[1];
    if (progress < 75) return this.loadingMessages[2];
    if (progress < 100) return this.loadingMessages[3];
    return this.loadingMessages[4];
  });
  private progressInterval: any = null;

  races = ['Human', 'Elf', 'Dwarf', 'Orc', 'Halfling', 'Dragonborn', 'Tiefling', 'Gnome'];
  classes = ['Warrior', 'Mage', 'Rogue', 'Cleric', 'Paladin', 'Ranger', 'Warlock', 'Bard', 'Monk'];

  // Data for randomization
  private firstNames = ['Aelar', 'Bryn', 'Caelan', 'Darian', 'Elara', 'Fendrel', 'Gareth', 'Hadrian', 'Ithil', 'Joric', 'Lyra', 'Maeve', 'Nia', 'Orin', 'Perrin', 'Quinn', 'Roric', 'Seraphina', 'Talon', 'Urien', 'Vael', 'Wren', 'Xylia', 'Yara', 'Zephyr'];
  private lastNames = ['Stormwind', 'Ironhand', 'Shadowglen', 'Brightwood', 'Stoneforged', 'Nightbreeze', 'Fireheart', 'Winterfall', 'Sunstrider', 'Blackwood', 'Silvermoon', 'Dragonfyre'];
  private specialElementAdjectives = ['glowing', 'ancient', 'runic', 'shadowy', 'ethereal', 'ornate', 'battle-scarred', 'gleaming', 'dark', 'crystal', 'fiery', 'frost-touched'];
  private specialElementFeatures = ['tattoos on their face', 'a mechanical arm', 'heterochromia eyes', 'long, braided hair', 'a prominent scar', 'pointed ears', 'small horns', 'a faint aura', 'unusual skin color', 'a prosthetic leg'];
  private specialElementItems = ['carrying a mystical orb', 'wielding a crystal-edged sword', 'wearing a cloak of raven feathers', 'adorned with bone jewelry', 'with a spirit animal companion', 'holding a gnarled staff', 'with a hovering arcane grimoire', 'wearing an enchanted amulet'];


  async generateCharacter(): Promise<void> {
    if (!this.characterName().trim() || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.generatedImage.set(null);
    this.characterStats.set(null);
    this.characterTraits.set(null);
    this.loadingProgress.set(0);

    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(() => {
      this.loadingProgress.update(p => {
        if (p >= 95) return 95; // Stall near the end
        return p + Math.floor(Math.random() * 5) + 1;
      });
    }, 410);

    const imagePrompt = this.constructImagePrompt();

    try {
      const imagePromise = this.geminiService.generateCharacterImage(imagePrompt);
      
      let traitsPromise: Promise<string[]> = Promise.resolve([]);
      if (this.includeRandomTraits()) {
        const traitsPrompt = this.constructTraitsPrompt();
        traitsPromise = this.geminiService.generateCharacterTraits(traitsPrompt);
      }

      const [base64Image, traits] = await Promise.all([imagePromise, traitsPromise]);
      
      this.generatedImage.set(`data:image/jpeg;base64,${base64Image}`);
      this.characterStats.set(this.generateStats());
       if (this.includeRandomTraits() && traits.length > 0) {
        this.characterTraits.set(traits);
      }

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred. Please try again.';
      this.error.set(`Failed to generate character: ${errorMessage}`);
      this.generatedImage.set(null); // Ensure form is shown on error
      console.error(e);
    } finally {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
      this.loadingProgress.set(100);
      setTimeout(() => {
        this.isLoading.set(false);
      }, 500); // Brief moment to show 100%
    }
  }

  resetForm(): void {
    this.generatedImage.set(null);
    this.characterStats.set(null);
    this.characterTraits.set(null);
    this.error.set(null);
    this.isLoading.set(false);
    this.loadingProgress.set(0);
    if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
    }
  }

  randomizeCharacter(): void {
    const randomRace = this.races[Math.floor(Math.random() * this.races.length)];
    this.characterRace.set(randomRace);

    const randomClass = this.classes[Math.floor(Math.random() * this.classes.length)];
    this.characterClass.set(randomClass);

    const randomFirstName = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
    const randomLastName = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
    this.characterName.set(`${randomFirstName} ${randomLastName}`);

    const randomAdjective = this.specialElementAdjectives[Math.floor(Math.random() * this.specialElementAdjectives.length)];
    const randomFeature = this.specialElementFeatures[Math.floor(Math.random() * this.specialElementFeatures.length)];
    const randomItem = this.specialElementItems[Math.floor(Math.random() * this.specialElementItems.length)];
    this.specialElements.set(`${randomAdjective} ${randomFeature}, ${randomItem}`);
    this.includeRandomTraits.set(Math.random() > 0.5);
  }

  private constructImagePrompt(): string {
    return `High-quality, detailed fantasy character portrait of a majestic ${this.characterRace()} ${this.characterClass()}. The character has ${this.specialElements()}. Art style: digital painting, epic fantasy, D&D character art, high detail, cinematic lighting, photorealistic.`;
  }

  private constructTraitsPrompt(): string {
    return `Generate an object with a "traits" property, which is an array of 3 distinct, one-word personality traits for a ${this.characterRace()} ${this.characterClass()}. Examples: Brave, Cautious, Greedy, Loyal, Impulsive.`;
  }
  
  private generateStats(): CharacterStats {
    return {
      strength: this.roll3d6(),
      dexterity: this.roll3d6(),
      constitution: this.roll3d6(),
      intelligence: this.roll3d6(),
      wisdom: this.roll3d6(),
      charisma: this.roll3d6()
    };
  }

  private roll3d6(): number {
    let total = 0;
    for (let i = 0; i < 3; i++) {
      total += Math.floor(Math.random() * 6) + 1;
    }
    return total;
  }
}