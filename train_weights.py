import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

df = pd.read_csv('joint.csv')
cols = df[["Code",'Housing','Population','Income','Stars']]
all = df[["Code",'Housing','Population','Income']]
drop = cols.dropna(axis=0)
predict = cols[["Code",'Stars']]
#Y_p = predict[['Housing','Population','Income']].to_numpy()
Y_p_all = all[['Housing','Population','Income']].to_numpy()
labels = drop["Stars"].to_numpy()
X = drop[['Housing', 'Population','Income']].to_numpy()

model = LinearRegression()
model.fit(X, labels)
s = model.predict(Y_p_all)
pred = []
for i in range(len(s)):
    if s[i] < 0:
        s[i] = 0
    else:
        s[i] = int(s[i])

predict["Stars"] = s.tolist()

final = predict[["Code","Stars"]]
final.columns = ["Code","Predicted_Stars"]

m = df.merge(final, left_on='Code', right_on='Code',how="outer")

m.to_csv("joint.csv",index=False)



