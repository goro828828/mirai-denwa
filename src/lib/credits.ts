/** 環境音の出典。ライセンス表示の義務がないものも、録音者への敬意として表示する */
export interface Credit {
  use: string
  title: string
  author: string
  license: string
  licenseUrl: string
  source: string
  note: string
}

export const AMBIENT_CREDITS: Credit[] = [
  {
    use: '晴れ・昼（小鳥のさえずり）',
    title: 'Dawn Chorus Sakala Forest Reserve Jarvemaa May 3rd 2026',
    author: 'John Grzinich',
    license: 'Public Domain Mark 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    source: 'https://archive.org/details/260502-dawn-chorus-sakala-forest-reserve-jarvemaa',
    note: '105分の録音から20分を抜粋し、音量を調整',
  },
  {
    use: '晴れ・夜（虫の声）',
    title: 'Grilli e Suoni Notturni - Crickets and Nocturnal Sounds',
    author: 'Ivan Guillaume Cosenza',
    license: 'Public Domain Mark 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    source: 'https://archive.org/details/CricketsAndNocturnalSounds',
    note: '71分の録音の前半から20分を抜粋し、音量を調整',
  },
  {
    use: '雨',
    title: 'rain, rural site, south Estonia（radio aporee）',
    author: 'John Grzinich',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    source: 'https://archive.org/details/rec_mobilemic18_2022_06_14_15_08_23',
    note: '57分の録音から20分を抜粋し、音量を調整。加工した音源も CC BY-SA 3.0 で提供',
  },
  {
    use: '雷雨',
    title: 'Storm Sicily 04082018 Afternoon',
    author: 'scarm',
    license: 'Public Domain Mark 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    source: 'https://archive.org/details/StormSicily04082018Afternoon',
    note: '40分の録音から20分を抜粋し、音量を調整',
  },
  {
    use: 'いつもの帰り道（初回の導入・カフェのそば）',
    title: 'Outdoor Cafe, Herefordshire, UK',
    author: 'David Pitt',
    license: 'Public Domain Mark 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    source: 'https://archive.org/details/aporee_69440_80838',
    note: '33分の録音から、音量の急な変化が少ない20分を抜粋し、音量を調整',
  },
]
