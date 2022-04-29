import math

import numpy as np
import pandas as pd



df = pd.read_csv('HousingData2019.csv')
df_income = pd.read_csv('IncomeStd.csv')
df_population = pd.read_csv("PopulationStd.csv",decimal=".")

Housing = df[["Area_Code","Average_Price"]]
Housing.columns = ["Code","Housing"]
Income = df_income[["AREACD","2019","AREANM"]]
Income.columns = ["Code","Income","Name"]
Pop = df_population[["Area Code","2019"]]
Pop.columns = ["Code","Population"]
Pop["Population"] = Pop['Population'].replace(',','', regex=True)
Pop["Population"] = pd.to_numeric(Pop["Population"] )


def calculate_constant(pop,income):
    print(income)
    return pop/100 + income*0.3

def rgb(value, minimum=71130, maximum=941023):
    minimum, maximum = float(minimum), float(maximum)
    ratio = 2 * (value-minimum) / (maximum - minimum)
    b = int(max(0, 255*(1 - ratio)))
    r = int(max(0, 255*(ratio - 1)))
    g = 255 - b - r
    return (r, g, b)


merge_2 = Housing.merge(Pop,left_on='Code',right_on='Code')
m = merge_2.merge(Income, left_on='Code', right_on='Code')

m["weighted"] = m.apply(lambda row: (row.Population/100) + row.Income*0.7 + row.Housing*0.7, axis=1)
m["Color"] = m["weighted"].apply(rgb)
print(m)
print(m["weighted"].max())
print(m["weighted"].min())

# Pop["Color"] = Pop["Population"].apply(rgb)
# print(Pop)

m.to_csv("joint.csv",index=False)
Pop.to_csv("population.csv",index=False)