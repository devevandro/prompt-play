export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  src: string;
}

export interface Radio {
  id: string;
  name: string;
  img: string;
  state: string;
  region: string;
  city: string;
  frequency: string;
  url: string;
}
