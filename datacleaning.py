import pandas as pd

df = pd.read_csv('1900_2021_DISASTERS.xlsx - emdat data.csv')

important_columns = ['Year', 'Disaster Type', 'Country', 'Total Deaths', 'Total Affected', "Total Damages ('000 US$)", 'Latitude', 'Longitude']
df_cleaned = df[important_columns].copy()

df_cleaned.rename(columns={
    "Total Deaths": "Total_Deaths",
    "Total Affected": "Total_Affected",
    "Disaster Type": "Disaster_Type",
    "Total Damages ('000 US$)": "Total_Damages_USD"
}, inplace=True)

df_cleaned['Total_Deaths'] = df_cleaned['Total_Deaths'].fillna(0)
df_cleaned['Total_Affected'] = df_cleaned['Total_Affected'].fillna(0)
df_cleaned['Total_Damages_USD'] = df_cleaned['Total_Damages_USD'].fillna(0)

df_cleaned = df_cleaned.dropna(subset=['Disaster_Type', 'Country'])

df_cleaned.to_csv('disasters_cleaned.csv', index=False)
