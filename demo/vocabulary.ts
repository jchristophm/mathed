import { Variable } from '../src/model';
export const sampleVocabulary: Variable[] = [
  { id: 'rock.mass', symbol: 'm_R', aliases: ['mass', 'm'], description: 'Rock mass', quantity: 'mass', object: 'Rock', units: 'kg' },
  { id: 'earth.gravity', symbol: 'g_E', aliases: ['gravity', 'g'], description: 'Earth gravitational field strength', object: 'Earth', units: 'm/s²' },
  { id: 'earth-rock.weight', symbol: 'W_{E,R}', aliases: ['weight', 'W'], description: 'Earth force on rock', object: 'Rock', units: 'N' },
  { id: 'string-rock.tension', symbol: 'T_{S,R}', aliases: ['tension', 'T'], description: 'String force on rock', object: 'Rock', units: 'N' },
  { id: 'rock.acceleration', symbol: 'a_R', aliases: ['acceleration', 'a'], description: 'Rock acceleration', object: 'Rock', units: 'm/s²' },
  { id: 'demo.mass', symbol: 'm', description: 'Unsubscripted mass (overlap fixture)' },
  { id: 'demo.mass-2', symbol: 'm_{R,2}', description: 'Second rock mass (overlap fixture)' }
];
